import { afterEach, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createGitCliStageRepository } from "@scriptorium/source-git";
import { loadProjectConfig } from "../../../../app/src/config/load-project-config";
import { createWorkerService } from "./index";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

test("webhook refresh skips code-only changes, publishes docs, and preserves content after a failed build", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "scriptorium-runtime-"));
  roots.push(root);
  const projectRoot = path.join(root, "repo");
  const generationsDir = path.join(root, "generations");
  const stateFile = path.join(root, "state.json");
  await mkdir(path.join(projectRoot, "docs/content"), { recursive: true });
  await writeFile(path.join(projectRoot, "scriptorium.project.json"), JSON.stringify({ name: "Test", logo: "docs/assets/logo.svg", versions: { home: "dev" } }));
  const page = path.join(projectRoot, "docs/content/index.mdx");
  await writeFile(page, "---\ntitle: Test\n---\nOriginal content.\n");
  const git = (...args: string[]) => execFileSync("git", args, { cwd: projectRoot, stdio: "pipe" });
  git("init", "--initial-branch", "dev");
  git("config", "user.name", "Scriptorium Test");
  git("config", "user.email", "scriptorium@example.invalid");
  git("config", "commit.gpgSign", "false");
  const commit = () => { git("add", "."); git("commit", "-m", "Update fixture"); };
  commit();
  const worker = createWorkerService({
    runtimePaths: { repoDir: projectRoot, generationsDir, stateFile },
    sourceAdapter: {
      type: "git",
      async prepareRepository() { return { projectRoot, repository: createGitCliStageRepository(projectRoot) }; }
    },
    async loadProject(root) {
      const project = await loadProjectConfig(root);
      return { project, workerProject: { homeRefName: project.versions.home, include: project.versions.include, extraRefNames: [] } };
    }
  });
  const state = async () => JSON.parse(await readFile(stateFile, "utf8"));
  const refresh = () => worker.requestPrepare({ reason: "webhook", event: "push" });
  await refresh();
  const first = await state();
  expect(first.phase).toBe("ready");
  await refresh();
  expect((await state()).activeGenerationId).toBe(first.activeGenerationId);
  expect(await readdir(generationsDir)).toEqual([first.activeGenerationId]);

  await writeFile(path.join(projectRoot, "code.txt"), "Unrelated source change");
  commit();
  await refresh();
  expect((await state()).activeGenerationId).toBe(first.activeGenerationId);

  await writeFile(page, "---\ntitle: Test\n---\nUpdated content.\n");
  commit();
  await refresh();
  const updated = await state();
  expect(updated.phase).toBe("ready");
  expect(updated.activeGenerationId).not.toBe(first.activeGenerationId);
  const artifact = path.join(generationsDir, updated.activeGenerationId, "page-artifacts/dev/index.json");
  expect(await readFile(artifact, "utf8")).toContain("Updated content.");

  await writeFile(page, '<Include src="./missing.mdx" />');
  commit();
  await refresh();
  expect((await state()).phase).toBe("error");
  expect((await state()).activeGenerationId).toBe(updated.activeGenerationId);
  expect(await readFile(artifact, "utf8")).toContain("Updated content.");
  expect((await readdir(generationsDir)).length).toBe(2);

  await writeFile(page, "---\ntitle: Test\n---\nUpdated content.\n");
  commit();
  await refresh();
  expect((await state()).phase).toBe("ready");
  expect((await state()).activeGenerationId).toBe(updated.activeGenerationId);
}, 20_000);
