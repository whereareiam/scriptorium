import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ServedPageIndexEntry } from "@scriptorium/server-api";

export async function writePageIndex(
  outputPath: string,
  entries: ServedPageIndexEntry[]
) {
  const body = JSON.stringify({
    entries
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, body);

  return Buffer.byteLength(body);
}
