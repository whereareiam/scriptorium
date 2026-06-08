import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "bun:test";
import { createGitCliStageRepository, syncGitCliRepository } from "./git-cli-repository";

const tempDirs: string[] = [];

function git(cwd: string, args: string[]) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

async function createRemoteRepo() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "scriptorium-git-cli-"));
  const remoteRoot = path.join(tempRoot, "remote");
  tempDirs.push(tempRoot);

  await mkdir(path.join(remoteRoot, "docs", "content"), { recursive: true });
  await mkdir(path.join(remoteRoot, "docs", "assets"), { recursive: true });
  git(tempRoot, ["init", "--initial-branch", "dev", remoteRoot]);
  git(remoteRoot, ["config", "user.email", "scriptorium@example.com"]);
  git(remoteRoot, ["config", "user.name", "Scriptorium"]);

  await writeFile(path.join(remoteRoot, "scriptorium.project.json"), "{}\n");
  await writeFile(path.join(remoteRoot, "docs", "content", "index.mdx"), "# Dev\n");
  await writeFile(path.join(remoteRoot, "docs", "assets", "logo.svg"), "<svg />\n");
  git(remoteRoot, ["add", "."]);
  git(remoteRoot, ["commit", "-m", "Initial docs"]);
  git(remoteRoot, ["tag", "v1.0.0"]);

  await writeFile(path.join(remoteRoot, "docs", "content", "index.mdx"), "# Release\n");
  git(remoteRoot, ["checkout", "-b", "release/1.x"]);
  git(remoteRoot, ["add", "."]);
  git(remoteRoot, ["commit", "-m", "Release docs"]);
  git(remoteRoot, ["checkout", "dev"]);

  return { tempRoot, remoteRoot };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("syncGitCliRepository", () => {
  it("syncs a runtime repository and exposes bundled refs", async () => {
    const { tempRoot, remoteRoot } = await createRemoteRepo();
    const repoDir = path.join(tempRoot, "runtime", "repo");

    await syncGitCliRepository({
      repoDir,
      repoUrl: remoteRoot,
      defaultBranch: "dev"
    });

    const repository = createGitCliStageRepository(repoDir);
    const refs = await repository.listRefs();

    expect(refs.map((ref) => ref.name).sort()).toEqual(["dev", "release/1.x", "v1.0.0"]);
    expect(await readFile(path.join(repoDir, "docs", "content", "index.mdx"), "utf8")).toContain("# Dev");
  });
});
