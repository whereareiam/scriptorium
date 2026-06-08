import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "bun:test";
import { createFromSource } from "fumadocs-core/search/server";
import type { BundleManifest } from "@scriptorium/bundle";
import {
  buildPreparedSearchDatabase,
  exportPreparedSearchIndex,
  loadPreparedSource
} from "./prepared-content";

describe("prepared search export", () => {
  it("matches the upstream advanced search export shape", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "scriptorium-search-"));
    const devDir = path.join(rootDir, "dev");
    const releaseDir = path.join(rootDir, "release");

    await writeDocsVersion(devDir, "Development Guide", "Development heading", "Development body");
    await writeDocsVersion(releaseDir, "Release Guide", "Release heading", "Release body");

    const bundle = createBundleManifest(rootDir, [
      { name: "dev", contentDir: devDir },
      { name: "1.0.0", contentDir: releaseDir }
    ]);

    const searchDatabase = await buildPreparedSearchDatabase(bundle);
    const actual = JSON.parse(exportPreparedSearchIndex(searchDatabase));

    const source = await loadPreparedSource(bundle);
    const expectedResponse = await createFromSource(source).staticGET();
    const expected = JSON.parse(await expectedResponse.text());

    expect(actual).toEqual(expected);
  });
});

async function writeDocsVersion(
  contentDir: string,
  pageTitle: string,
  heading: string,
  body: string
) {
  await mkdir(contentDir, { recursive: true });
  await writeJson(path.join(contentDir, "meta.json"), {
    title: "Docs",
    pages: ["guide"]
  });
  await writeFile(
    path.join(contentDir, "guide.mdx"),
    [
      "---",
      `title: ${pageTitle}`,
      `description: ${body}`,
      "---",
      "",
      `# ${heading}`,
      "",
      body
    ].join("\n")
  );
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, JSON.stringify(value, null, 2));
}

function createBundleManifest(
  rootDir: string,
  versions: Array<{ name: string; contentDir: string }>
): BundleManifest {
  return {
    generatedAt: new Date().toISOString(),
    projectRoot: rootDir,
    repoRoot: rootDir,
    project: {
      name: "Test Project",
      logo: "docs/assets/logo.svg",
      versions: {
        home: "dev",
        include: [],
        meta: {}
      }
    },
    versions: versions.map(({ name, contentDir }) => ({
      name,
      kind: name === "dev" ? "branch" : "tag",
      fullName: name === "dev" ? "refs/heads/dev" : `refs/tags/${name}`,
      objectName: name,
      contentDir,
      assetsDir: path.join(contentDir, "assets"),
      configPath: path.join(contentDir, "scriptorium.project.json")
    }))
  };
}
