import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "bun:test";
import { createLocalContractWatcher } from "./contract-watcher";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("createLocalContractWatcher", () => {
  it("triggers for contract file changes and ignores unrelated files", async () => {
    const projectRoot = await createProjectRoot();
    let changes = 0;
    const watcher = createLocalContractWatcher({
      projectRoot,
      debounceMs: 50,
      onChange() {
        changes += 1;
      }
    });

    await wait(100);
    await writeFile(path.join(projectRoot, "notes.md"), "# ignored\n");
    await wait(200);
    expect(changes).toBe(0);

    await writeFile(path.join(projectRoot, "docs", "content", "index.mdx"), "# changed\n");
    await wait(250);
    watcher.close();

    expect(changes).toBe(1);
  });
});

async function createProjectRoot() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "scriptorium-local-watch-"));
  tempDirs.push(dir);

  await mkdir(path.join(dir, "docs", "content"), { recursive: true });
  await mkdir(path.join(dir, "docs", "assets"), { recursive: true });
  await writeFile(path.join(dir, "scriptorium.project.json"), "{}\n");
  await writeFile(path.join(dir, "docs", "content", "index.mdx"), "# start\n");
  await writeFile(path.join(dir, "docs", "assets", "logo.svg"), "<svg />\n");

  return dir;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
