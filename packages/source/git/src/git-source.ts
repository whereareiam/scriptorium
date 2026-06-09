import { execFileSync } from "node:child_process";
import type { SourceRef } from "@scriptorium/source-api";

export function getRepositoryRoot(startDir: string) {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: startDir,
    encoding: "utf8"
  }).trim();
}

export function listGitRefs(projectRoot: string): SourceRef[] {
  const raw = execFileSync(
    "git",
    ["for-each-ref", "--format=%(objectname)%00%(refname)", "refs/heads", "refs/tags"],
    {
      cwd: getRepositoryRoot(projectRoot),
      encoding: "utf8"
    }
  );

  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [objectName, fullName] = line.split("\0");
      if (!objectName || !fullName)
        return null;

      if (fullName.startsWith("refs/heads/")) {
        return {
          kind: "branch",
          name: fullName.slice("refs/heads/".length),
          fullName,
          objectName
        } satisfies SourceRef;
      }

      return {
        kind: "tag",
        name: fullName.slice("refs/tags/".length),
        fullName,
        objectName
      } satisfies SourceRef;
    })
    .filter((entry): entry is SourceRef => entry !== null);
}
