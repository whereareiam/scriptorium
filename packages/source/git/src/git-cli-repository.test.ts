import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { syncGitCliRepository } from "./git-cli-repository";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe("syncGitCliRepository", () => {
  for (const tagType of ["lightweight", "annotated"] as const) {
    test(`refreshes dev after moving a tag (${tagType}) and prunes deleted tags`, async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "scriptorium-git-sync-"));
      temporaryDirectories.push(root);
      const source = path.join(root, "source");
      const repoDir = path.join(root, "cache");
      git(root, "init", "--initial-branch", "dev", source);
      git(source, "config", "user.name", "Scriptorium Test");
      git(source, "config", "user.email", "scriptorium@example.invalid");
      git(source, "config", "commit.gpgSign", "false");
      git(source, "config", "tag.gpgSign", "false");

      await writeFile(path.join(source, "docs.md"), "Original docs\n");
      git(source, "add", "docs.md");
      git(source, "commit", "-m", "Initial docs");
      const tagArgs = tagType === "annotated" ? ["-a", "-m", "Release"] : [];
      git(source, "tag", ...tagArgs, "0.0.1");
      git(source, "tag", "obsolete");

      const options = { repoDir, repoUrl: source, defaultBranch: "dev" };
      await syncGitCliRepository(options);
      const initialTag = git(repoDir, "rev-parse", "refs/tags/0.0.1");
      expect(await readFile(path.join(repoDir, "docs.md"), "utf8")).toBe("Original docs\n");

      await writeFile(path.join(source, "docs.md"), "Updated docs\n");
      git(source, "add", "docs.md");
      git(source, "commit", "-m", "Update docs");
      git(source, "tag", "--force", ...tagArgs, "0.0.1");
      git(source, "tag", "--delete", "obsolete");

      await syncGitCliRepository(options);

      expect(git(repoDir, "rev-parse", "HEAD")).toBe(git(source, "rev-parse", "dev"));
      expect(git(repoDir, "rev-parse", "refs/tags/0.0.1")).toBe(git(source, "rev-parse", "refs/tags/0.0.1"));
      expect(git(repoDir, "rev-parse", "refs/tags/0.0.1")).not.toBe(initialTag);
      expect(git(repoDir, "tag", "--list")).toBe("0.0.1");
      expect(await readFile(path.join(repoDir, "docs.md"), "utf8")).toBe("Updated docs\n");
      expect(git(repoDir, "status", "--porcelain")).toBe("");
    });
  }
});

function git(cwd: string, ...args: string[]) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}
