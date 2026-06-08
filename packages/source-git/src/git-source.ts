import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { SourceRef } from "@scriptorium/core";

const execFileAsync = promisify(execFile);
const GIT_MAX_BUFFER = 16 * 1024 * 1024;

async function runGit(projectRoot: string, args: string[]) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: GIT_MAX_BUFFER
  });

  return stdout.trim();
}

export function getRepositoryRoot(projectRoot: string) {
  return runGit(projectRoot, ["rev-parse", "--show-toplevel"]);
}

export async function listGitRefs(projectRoot: string) {
  const output = await runGit(projectRoot, [
    "for-each-ref",
    "--format=%(refname:short)|%(refname)|%(objectname)",
    "refs/heads",
    "refs/remotes/origin",
    "refs/tags"
  ]);

  if (output === "") {
    return [];
  }

  const refs = new Map<string, SourceRef>();

  for (const line of output.split("\n")) {
    const [rawName, fullName, objectName] = line.split("|");
    if (rawName === "origin/HEAD") continue;
    if (rawName === "origin") continue;

    const kind = fullName.startsWith("refs/tags/") ? "tag" : "branch";
    const name = rawName.startsWith("origin/") ? rawName.slice("origin/".length) : rawName;

    const existing = refs.get(name);
    if (existing && existing.fullName.startsWith("refs/heads/")) {
      continue;
    }

    refs.set(name, {
      name,
      fullName,
      objectName,
      kind
    });
  }

  return Array.from(refs.values());
}
