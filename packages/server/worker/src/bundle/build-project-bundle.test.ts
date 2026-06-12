import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ScriptoriumProjectConfig } from "@scriptorium/server-api";
import type { SourceRef, StageRepository } from "@scriptorium/source-api";
import type { WorkerProject } from "@scriptorium/server-worker-api";
import { buildProjectBundle } from "./build-project-bundle";

describe("buildProjectBundle", () => {
  test("skips optional refs that do not contain the full docs contract", async () => {
    const projectRoot = await createProjectRoot();
    const outputDir = await mkdtemp(path.join(os.tmpdir(), "scriptorium-bundle-output-"));

    try {
      const bundle = await buildProjectBundle({
        projectRoot,
        outputDir,
        repository: createRepository({
          repoRoot: projectRoot,
          refs: [
            makeRef("dev", "branch"),
            makeRef("0.2.0", "tag")
          ],
          filesByRef: {
            "refs/heads/dev": [
              "docs/content/index.mdx",
              "docs/assets/logo.png",
              "scriptorium.project.json"
            ],
            "refs/tags/0.2.0": [
              "docs/content/index.mdx"
            ]
          }
        }),
        async loadProject() {
          return createProject();
        }
      });

      expect(bundle.versions.map((version) => version.name)).toEqual(["dev"]);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  test("fails when the home ref does not contain the full docs contract", async () => {
    const projectRoot = await createProjectRoot();
    const outputDir = await mkdtemp(path.join(os.tmpdir(), "scriptorium-bundle-output-"));

    try {
      await expect(buildProjectBundle({
        projectRoot,
        outputDir,
        repository: createRepository({
          repoRoot: projectRoot,
          refs: [makeRef("dev", "branch")],
          filesByRef: {
            "refs/heads/dev": [
              "docs/content/index.mdx"
            ]
          }
        }),
        async loadProject() {
          return createProject();
        }
      })).rejects.toThrow('Ref "dev" is missing required docs contract paths: scriptorium.project.json.');
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
      await rm(outputDir, { recursive: true, force: true });
    }
  });
});

async function createProjectRoot() {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "scriptorium-project-"));
  await mkdir(path.join(projectRoot, "docs", "content"), { recursive: true });
  await mkdir(path.join(projectRoot, "docs", "assets"), { recursive: true });
  await writeFile(path.join(projectRoot, "docs", "content", "index.mdx"), "# Home\n");
  await writeFile(path.join(projectRoot, "docs", "assets", "logo.png"), "logo\n");
  await writeFile(path.join(projectRoot, "scriptorium.project.json"), "{}\n");
  return projectRoot;
}

function createProject(): {
  project: ScriptoriumProjectConfig;
  workerProject: WorkerProject;
} {
  return {
    project: {
      name: "Test Project",
      logo: "docs/assets/logo.png",
      versions: {
        home: "dev",
        include: [{ type: "tag", pattern: "*" }],
        meta: {}
      }
    },
    workerProject: {
      homeRefName: "dev",
      include: [{ type: "tag", pattern: "*" }],
      extraRefNames: []
    }
  };
}

function createRepository(options: {
  repoRoot?: string;
  refs: SourceRef[];
  filesByRef: Record<string, string[]>;
}): StageRepository {
  return {
    repoRoot: options.repoRoot ?? ".",
    async listRefs() {
      return options.refs;
    },
    async listFiles(refName) {
      return options.filesByRef[refName] ?? [];
    },
    async readFile(_, filePath) {
      return Buffer.from(`content for ${filePath}`);
    }
  };
}

function makeRef(name: string, kind: SourceRef["kind"]): SourceRef {
  return {
    name,
    kind,
    objectName: `${name}-object`,
    fullName: kind === "branch" ? `refs/heads/${name}` : `refs/tags/${name}`
  };
}
