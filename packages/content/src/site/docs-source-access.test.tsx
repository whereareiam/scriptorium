import { describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { BundleManifest } from "@scriptorium/bundle";
import { createDocsSourceAccess } from "./docs-source-access";

describe("createDocsSourceAccess", () => {
  it("includes shared partials at compile time without exposing them as pages", async () => {
    const contentDir = await mkdtemp(path.join(os.tmpdir(), "scriptorium-content-"));
    await mkdir(path.join(contentDir, "_partials"), { recursive: true });

    await writeJson(path.join(contentDir, "meta.json"), {
      title: "Docs",
      pages: ["guide"]
    });
    await writeFile(
      path.join(contentDir, "_partials", "proxy.mdx"),
      [
        "Velocity and Bungeecord share this explanation.",
        "",
        "- forwarded traffic stays on the proxy path",
        "- backend server config remains the same"
      ].join("\n")
    );
    await writeFile(
      path.join(contentDir, "guide.mdx"),
      [
        "---",
        "title: Guide",
        "---",
        "",
        "# Proxy Setup",
        "",
        "<ContentTabs items={['Velocity', 'Bungeecord', 'Paper']}>",
        "  <ContentTab value=\"Velocity\">",
        "    <Include src=\"./_partials/proxy.mdx\" />",
        "  </ContentTab>",
        "  <ContentTab value=\"Bungeecord\">",
        "    <Include src=\"./_partials/proxy.mdx\" />",
        "  </ContentTab>",
        "  <ContentTab value=\"Paper\">",
        "    Paper uses its own explanation.",
        "  </ContentTab>",
        "</ContentTabs>"
      ].join("\n")
    );

    const sourceAccess = createDocsSourceAccess(async () => createBundleManifest(contentDir));
    const { source } = await sourceAccess.getSource();

    const page = source.getPage(["dev", "guide"]);
    expect(page).toBeTruthy();

    const partialPage = source.getPages().find((entry) => entry.url.includes("_partials"));
    expect(partialPage).toBeUndefined();

    const loaded = await page!.data.load();
    expect(JSON.stringify(loaded.structuredData)).toContain("Velocity and Bungeecord share this explanation.");

    const rendered = await loaded.render({
      ContentTabs: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
      ContentTab: ({ children }: { children?: ReactNode }) => <section>{children}</section>
    });

    const html = renderToStaticMarkup(<>{rendered.body}</>);
    expect(html).toContain("Velocity and Bungeecord share this explanation.");
    expect(html).toContain("Paper uses its own explanation.");
  });

  it("reloads the docs source after invalidation", async () => {
    const contentDir = await mkdtemp(path.join(os.tmpdir(), "scriptorium-content-"));
    await writeBasicDocs(contentDir, "First title");

    const sourceAccess = createDocsSourceAccess(async () => createBundleManifest(contentDir));
    const first = await loadIndexTitle(sourceAccess);

    await writeBasicDocs(contentDir, "Second title");
    const cached = await loadIndexTitle(sourceAccess);
    sourceAccess.invalidate();
    const reloaded = await loadIndexTitle(sourceAccess);

    expect(first).toBe("First title");
    expect(cached).toBe("First title");
    expect(reloaded).toBe("Second title");
  });
});

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, JSON.stringify(value, null, 2));
}

function createBundleManifest(contentDir: string): BundleManifest {
  return {
    generatedAt: new Date().toISOString(),
    projectRoot: contentDir,
    repoRoot: contentDir,
    project: {
      name: "Test Project",
      logo: "docs/assets/logo.svg",
      versions: {
        home: "dev",
        include: [],
        meta: {}
      }
    },
    versions: [
      {
        name: "dev",
        kind: "branch",
        fullName: "refs/heads/dev",
        objectName: "dev",
        contentDir,
        assetsDir: path.join(contentDir, "assets"),
        configPath: path.join(contentDir, "scriptorium.project.json")
      }
    ]
  };
}

async function writeBasicDocs(contentDir: string, title: string) {
  await mkdir(contentDir, { recursive: true });
  await writeJson(path.join(contentDir, "meta.json"), {
    title: "Docs",
    pages: ["index"]
  });
  await writeFile(
    path.join(contentDir, "index.mdx"),
    [
      "---",
      `title: ${title}`,
      "---",
      "",
      `# ${title}`
    ].join("\n")
  );
}

async function loadIndexTitle(sourceAccess: ReturnType<typeof createDocsSourceAccess>) {
  const { source } = await sourceAccess.getSource();
  const page = source.getPage(["dev"]);

  if (!page) {
    throw new Error("Expected index page to be available.");
  }

  const loaded = await page.data.load();
  return page.data.title ?? loaded.structuredData.headings[0]?.content;
}
