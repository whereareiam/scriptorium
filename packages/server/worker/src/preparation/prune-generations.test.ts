import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readdir, rm, utimes } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pruneGenerations } from "./prune-generations";

test("pruning preserves active, fallback, recent, and unrelated directories", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "scriptorium-prune-"));
  const ids = ["2026-01-01T00-00-00.000Z-aaaaaaaa", "2026-01-02T00-00-00.000Z-bbbbbbbb", "2026-01-03T00-00-00.000Z-cccccccc", "2026-01-04T00-00-00.000Z-dddddddd", "unrelated"];
  try {
    for (const id of ids) {
      await mkdir(path.join(root, id));
      if (id !== ids[3]) await utimes(path.join(root, id), 0, 0);
    }
    await pruneGenerations(root, [ids[0], ids[1]]);
    expect((await readdir(root)).sort()).toEqual([ids[0], ids[1], ids[3], ids[4]].sort());
  } finally { await rm(root, { recursive: true, force: true }); }
});
