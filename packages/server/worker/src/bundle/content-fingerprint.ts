import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/** Hash staged docs, expanded includes, assets, version names, and project settings. */
export async function getContentFingerprint(bundleDir: string, project: unknown): Promise<string> {
  const hash = createHash("sha256");
  hash.update(JSON.stringify(project));
  await visit(bundleDir, "");
  return hash.digest("hex");

  async function visit(directory: string, prefix: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relative = `${prefix}${entry.name}`;
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        hash.update(`dir:${relative}\0`);
        await visit(filePath, `${relative}/`);
      } else {
        const bytes = await readFile(filePath);
        hash.update(`file:${relative}\0${bytes.length}\0`);
        hash.update(bytes);
      }
    }
  }
}
