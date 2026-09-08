import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getContentFingerprint } from "./content-fingerprint";

test("fingerprints are location independent and include assets, paths, and project settings", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "scriptorium-fingerprint-"));
  try {
    const first = path.join(root, "first"), second = path.join(root, "second");
    for (const directory of [first, second]) {
      await mkdir(directory);
      await writeFile(path.join(directory, "logo.bin"), Buffer.from([0, 1, 255]));
    }
    const fingerprint = await getContentFingerprint(first, { name: "Docs" });
    expect(await getContentFingerprint(second, { name: "Docs" })).toBe(fingerprint);
    expect(await getContentFingerprint(first, { name: "Renamed" })).not.toBe(fingerprint);
    await writeFile(path.join(second, "logo.bin"), Buffer.from([0, 2, 255]));
    expect(await getContentFingerprint(second, { name: "Docs" })).not.toBe(fingerprint);
    await rename(path.join(first, "logo.bin"), path.join(first, "renamed.bin"));
    expect(await getContentFingerprint(first, { name: "Docs" })).not.toBe(fingerprint);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
