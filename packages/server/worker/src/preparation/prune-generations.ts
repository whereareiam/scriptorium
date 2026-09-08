import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

/** Keep active/fallback content and give in-flight readers a minute to finish. */
export async function pruneGenerations(generationsDir: string, retainedIds: string[], now = Date.now()) {
  const retained = new Set(retainedIds);
  const entries = await readdir(generationsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || retained.has(entry.name) || !/^\d{4}-\d{2}-\d{2}T[\d-]+\.\d{3}Z-[a-f0-9]{8}$/.test(entry.name))
      continue;
    const directory = path.join(generationsDir, entry.name);
    if (now - (await stat(directory)).mtimeMs < 60_000)
      continue;
    await rm(directory, { recursive: true, force: true });
  }
}
