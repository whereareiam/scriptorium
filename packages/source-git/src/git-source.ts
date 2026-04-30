import { execFileSync } from "node:child_process";
import type { SourceRef } from "@scriptorium/core";

function runGit(projectRoot: string, args: string[]) {
  return execFileSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8"
  }).trim();
}

export function getRepositoryRoot(projectRoot: string) {
  return runGit(projectRoot, ["rev-parse", "--show-toplevel"]);
}

export function listGitRefs(projectRoot: string) {
  const output = runGit(projectRoot, [
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
