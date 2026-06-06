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
    const listeners = new Map<string, (eventType: string, fileName: string | Buffer | null) => void>();
    const watcher = createLocalContractWatcher({
      projectRoot,
      debounceMs: 50,
      onChange() {
        changes += 1;
      },
      watchFactory(dir, _options, listener) {
        listeners.set(dir, listener);
        return {
          close() {
            listeners.delete(dir);
          }
        } as never;
      }
    });

    await wait(100);
    listeners.get(projectRoot)?.("change", "notes.md");
    await wait(200);
    expect(changes).toBe(0);

    listeners.get(path.join(projectRoot, "docs", "content"))?.("change", "guide.mdx");
    await waitFor(() => changes === 1, 1500);
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

async function waitFor(predicate: () => boolean, timeoutMs: number) {
  const startedAt = Date.now();

  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      break;
    }

    await wait(50);
  }
}
