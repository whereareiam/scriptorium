import { execFileSync } from "node:child_process";
import semver from "semver";
import type { ScriptoriumProjectConfig } from "./config";

export type GitRefKind = "branch" | "tag";

export interface GitRef {
  name: string;
  fullName: string;
  objectName: string;
  kind: GitRefKind;
}

function runGit(projectRoot: string, args: string[]) {
  return execFileSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8"
  }).trim();
}

function compareTagNames(left: string, right: string) {
  const leftNormalized = semver.valid(left) ?? semver.valid(left.replace(/^v/, ""));
  const rightNormalized = semver.valid(right) ?? semver.valid(right.replace(/^v/, ""));

  if (leftNormalized && rightNormalized) {
    return semver.compare(leftNormalized, rightNormalized);
  }

  return left.localeCompare(right);
}

export function getRepositoryRoot(projectRoot: string) {
  return runGit(projectRoot, ["rev-parse", "--show-toplevel"]);
}

export function listGitRefs(projectRoot: string) {
  const output = runGit(projectRoot, [
    "for-each-ref",
    "--format=%(refname:short)|%(refname)|%(objectname)",
    "refs/heads",
    "refs/tags"
  ]);

  if (output === "") {
    return [];
  }

  return output.split("\n").map((line) => {
    const [name, fullName, objectName] = line.split("|");

    return {
      name,
      fullName,
      objectName,
      kind: fullName.startsWith("refs/tags/") ? "tag" : "branch"
    } satisfies GitRef;
  });
}

export function filterPublishedRefs(refs: GitRef[], config: ScriptoriumProjectConfig) {
  const selected = new Map<string, GitRef>();
  const {
    includeDefaultRef,
    includeReleaseBranches,
    includeTags,
    releaseBranchPrefix,
    extraRefs
  } = config.refRules;

  const defaultRef = refs.find((ref) => ref.name === config.defaultRef);
  if (!defaultRef) {
    throw new Error(`Unable to resolve default ref "${config.defaultRef}".`);
  }

  if (includeDefaultRef) {
    selected.set(defaultRef.name, defaultRef);
  }

  if (includeReleaseBranches) {
    for (const ref of refs) {
      if (ref.kind !== "branch") continue;
      if (!ref.name.startsWith(releaseBranchPrefix)) continue;
      selected.set(ref.name, ref);
    }
  }

  if (includeTags) {
    for (const ref of refs) {
      if (ref.kind !== "tag") continue;
      selected.set(ref.name, ref);
    }
  }

  for (const refName of extraRefs) {
    const ref = refs.find((candidate) => candidate.name === refName);
    if (ref) {
      selected.set(ref.name, ref);
    }
  }

  return Array.from(selected.values()).sort((left, right) => {
    if (left.name === config.defaultRef) return -1;
    if (right.name === config.defaultRef) return 1;
    if (left.kind !== right.kind) return left.kind === "branch" ? -1 : 1;
    if (left.kind === "tag" && right.kind === "tag") {
      return compareTagNames(left.name, right.name);
    }

    return left.name.localeCompare(right.name);
  });
}
