import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "bun:test";
import { isBundledContractPath } from "@scriptorium/core";
import { createGitCliStageRepository, createIsomorphicGitStageRepository } from "@scriptorium/source-git";
import { createDocsSourceAccess } from "@scriptorium/content";
import { readBundleManifest } from "./read-bundle-manifest";
import { buildProjectBundle } from "./build-project-bundle";

const tempDirs: string[] = [];

function git(cwd: string, args: string[]) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, JSON.stringify(value, null, 2));
}

async function createFixtureRepo() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "scriptorium-"));
  const repoRoot = path.join(tempRoot, "repo");
  const projectRoot = path.join(repoRoot, "apps", "docs-site");
  tempDirs.push(tempRoot);

  await mkdir(path.join(projectRoot, "docs", "content", "guides"), { recursive: true });
  await mkdir(path.join(projectRoot, "docs", "assets"), { recursive: true });
  await mkdir(path.join(projectRoot, "docs", "not-bundled"), { recursive: true });
  await mkdir(path.join(projectRoot, "notes"), { recursive: true });

  git(tempRoot, ["init", "--initial-branch=dev", repoRoot]);
  git(repoRoot, ["config", "user.email", "scriptorium@example.com"]);
  git(repoRoot, ["config", "user.name", "Scriptorium"]);

  await writeJson(path.join(projectRoot, "scriptorium.project.json"), {
    name: "Fixture Project",
    description: "Fixture docs for tests",
    logo: "docs/assets/logo.svg",
    urls: {
      github: "https://example.invalid/repo"
    },
    versions: {
      home: "dev",
      include: [
        { type: "branch", pattern: "release/*" },
        { type: "tag", pattern: "*" }
      ],
      meta: {
        dev: {
          label: "Development"
        }
      }
    }
  });

  await writeFile(
    path.join(projectRoot, "docs", "content", "meta.json"),
    JSON.stringify({ title: "Docs", pages: ["index", "guides"] }, null, 2)
  );
  await writeFile(
    path.join(projectRoot, "docs", "content", "index.mdx"),
    "---\ntitle: Overview\ndescription: Fixture overview\n---\n\n# Overview\n"
  );
  await writeFile(
    path.join(projectRoot, "docs", "content", "guides", "meta.json"),
    JSON.stringify({ title: "Guides", pages: ["getting-started"] }, null, 2)
  );
  await writeFile(
    path.join(projectRoot, "docs", "content", "guides", "getting-started.mdx"),
    "---\ntitle: Getting Started\ndescription: Base guide\n---\n\n# Getting Started\n"
  );
  await writeFile(path.join(projectRoot, "docs", "assets", "logo.svg"), "<svg><rect width=\"10\" height=\"10\"/></svg>\n");
  await writeFile(path.join(projectRoot, "docs", "not-bundled", "draft.md"), "# Ignore me\n");
  await writeFile(path.join(projectRoot, "notes", "README.md"), "# Internal notes\n");

  git(repoRoot, ["add", "."]);
  git(repoRoot, ["commit", "-m", "Initial docs"]);
  git(repoRoot, ["tag", "v1.0.0"]);

  await writeFile(
    path.join(projectRoot, "docs", "content", "guides", "getting-started.mdx"),
    "---\ntitle: Getting Started\ndescription: Dev guide\n---\n\n# Getting Started\n\nUpdated on dev.\n"
  );
  git(repoRoot, ["add", "."]);
  git(repoRoot, ["commit", "-m", "Update dev guide"]);
  git(repoRoot, ["tag", "v1.1.0"]);

  git(repoRoot, ["checkout", "-b", "release/1.x"]);
  await writeFile(
    path.join(projectRoot, "docs", "content", "index.mdx"),
    "---\ntitle: Overview\ndescription: Release overview\n---\n\n# Release Overview\n"
  );
  git(repoRoot, ["add", "."]);
  git(repoRoot, ["commit", "-m", "Release docs"]);

  git(repoRoot, ["checkout", "dev"]);
  git(repoRoot, ["checkout", "-b", "feature/ignore-me"]);
  await writeFile(path.join(projectRoot, "docs", "content", "feature-only.mdx"), "---\ntitle: Feature\n---\n\n# Feature\n");
  git(repoRoot, ["add", "."]);
  git(repoRoot, ["commit", "-m", "Feature docs"]);
  git(repoRoot, ["checkout", "dev"]);

  return { repoRoot, projectRoot };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("buildProjectBundle", () => {
  it("exports only allowed refs and only bundled contract files", async () => {
    const { projectRoot } = await createFixtureRepo();
    const manifest = await buildProjectBundle({
      projectRoot,
      repository: createGitCliStageRepository(projectRoot)
    });

    expect(manifest.versions.map((version) => version.name)).toEqual([
      "dev",
      "release/1.x",
      "v1.0.0",
      "v1.1.0"
    ]);

    const bundledDraftPath = path.join(projectRoot, ".scriptorium", "bundle", "versions", "dev", "draft.md");
    await expect(readFile(bundledDraftPath, "utf8")).rejects.toThrow();

    expect(isBundledContractPath("apps/docs-site/docs/content/index.mdx", projectRoot, manifest.repoRoot)).toBe(true);
    expect(isBundledContractPath("apps/docs-site/docs/not-bundled/draft.md", projectRoot, manifest.repoRoot)).toBe(false);
  });

  it("builds a loader that excludes non-doc fixture content", async () => {
    const { projectRoot } = await createFixtureRepo();
    await buildProjectBundle({
      projectRoot,
      repository: createGitCliStageRepository(projectRoot)
    });
    const { getSource } = createDocsSourceAccess((root = projectRoot) => readBundleManifest(root));
    const { source } = await getSource(projectRoot);

    expect(source.getPages().map((page) => page.path).sort()).toEqual([
      "dev/guides/getting-started.mdx",
      "dev/index.mdx",
      "release~1.x/guides/getting-started.mdx",
      "release~1.x/index.mdx",
      "v1.0.0/guides/getting-started.mdx",
      "v1.0.0/index.mdx",
      "v1.1.0/guides/getting-started.mdx",
      "v1.1.0/index.mdx"
    ]);
  });

  it("supports staging through the isomorphic git repository adapter", async () => {
    const { projectRoot, repoRoot } = await createFixtureRepo();
    const manifest = await buildProjectBundle({
      projectRoot,
      repository: createIsomorphicGitStageRepository(repoRoot)
    });

    expect(manifest.versions.map((version) => version.name)).toEqual([
      "dev",
      "release/1.x",
      "v1.0.0",
      "v1.1.0"
    ]);
  });

  it("serializes concurrent staging to the same output directory", async () => {
    const { projectRoot } = await createFixtureRepo();

    const [left, right] = await Promise.all([
      buildProjectBundle({
        projectRoot,
        repository: createGitCliStageRepository(projectRoot)
      }),
      buildProjectBundle({
        projectRoot,
        repository: createGitCliStageRepository(projectRoot)
      })
    ]);

    expect(left.versions.map((version) => version.name)).toEqual([
      "dev",
      "release/1.x",
      "v1.0.0",
      "v1.1.0"
    ]);
    expect(right.versions.map((version) => version.name)).toEqual(left.versions.map((version) => version.name));
  });
});
