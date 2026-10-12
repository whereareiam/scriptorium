import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { gitBlobHash } from "./git-blob-hash";

test("matches git hash-object", () => {
  const content = Buffer.from("---\ntitle: Привет\n---\n\nBody\n");
  const expected = execFileSync("git", ["hash-object", "--stdin"], { input: content }).toString().trim();

  expect(gitBlobHash(content)).toBe(expected);
});
