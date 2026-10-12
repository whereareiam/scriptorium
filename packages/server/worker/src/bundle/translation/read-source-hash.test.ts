import { expect, test } from "bun:test";
import { readSourceHash } from "./read-source-hash";

const HASH = "8d3f0a1c2b9e4f6a7c5d1e0b3a2f9c8d7e6b5a4f";

test("reads the hash from the frontmatter", () => {
  expect(readSourceHash(`---\ntitle: Обзор\nsourceHash: ${HASH}\n---\n\nТекст\n`)).toBe(HASH);
  expect(readSourceHash(`---\nsourceHash: "${HASH}"\n---\n`)).toBe(HASH);
});

test("ignores a hash outside the frontmatter or without frontmatter", () => {
  expect(readSourceHash(`---\ntitle: Обзор\n---\n\nsourceHash: ${HASH}\n`)).toBeUndefined();
  expect(readSourceHash(`# Title\n`)).toBeUndefined();
});
