import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ServedPageTreeRoot } from "@scriptorium/server-api";

export async function writePageTree(
  outputPath: string,
  tree: ServedPageTreeRoot
) {
  const body = JSON.stringify(tree);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, body);

  return Buffer.byteLength(body);
}
