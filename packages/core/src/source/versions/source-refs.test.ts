import { describe, expect, it } from "bun:test";
import { filterPublishedRefs, type SourceRef } from "./source-refs";
import type { ScriptoriumProjectConfig } from "../../project/project-config";

const config: ScriptoriumProjectConfig = {
  name: "Sample",
  description: "Sample",
  logo: "docs/assets/logo.svg",
  urls: {
    github: "https://github.com/example/sample"
  },
  versions: {
    home: "dev",
    include: [
      { type: "branch", pattern: "release/*" },
      { type: "tag", pattern: "*" }
    ],
    meta: {}
  }
};

const refs: SourceRef[] = [
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
        versions: {
          ...config.versions,
          home: "main"
        }
      })
    ).toThrow('Unable to resolve home version "main".');
  });
});
