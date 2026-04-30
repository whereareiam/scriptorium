import { describe, expect, it } from "vitest";
import { filterPublishedRefs, type GitRef } from "./git";
import type { ScriptoriumProjectConfig } from "./config";

const config: ScriptoriumProjectConfig = {
  name: "Sample",
  description: "Sample",
  logo: "docs/assets/logo.svg",
  defaultRef: "dev",
  refs: {},
  links: [],
  refRules: {
    defaultBranch: "dev",
    releaseBranchPrefix: "release/",
    includeDefaultRef: true,
    includeReleaseBranches: true,
    includeTags: true,
    extraRefs: []
  }
};

const refs: GitRef[] = [
  { name: "feature/demo", fullName: "refs/heads/feature/demo", objectName: "1", kind: "branch" },
  { name: "release/1.x", fullName: "refs/heads/release/1.x", objectName: "2", kind: "branch" },
  { name: "dev", fullName: "refs/heads/dev", objectName: "3", kind: "branch" },
  { name: "v1.0.0", fullName: "refs/tags/v1.0.0", objectName: "4", kind: "tag" },
  { name: "v1.2.0", fullName: "refs/tags/v1.2.0", objectName: "5", kind: "tag" }
];

describe("filterPublishedRefs", () => {
  it("keeps the default ref, release branches, and tags", () => {
    expect(filterPublishedRefs(refs, config).map((ref) => ref.name)).toEqual([
      "dev",
      "release/1.x",
      "v1.0.0",
      "v1.2.0"
    ]);
  });

  it("throws when the configured default ref is missing", () => {
    expect(() =>
      filterPublishedRefs(refs, {
        ...config,
        defaultRef: "main"
      })
    ).toThrow('Unable to resolve default ref "main".');
  });
});
