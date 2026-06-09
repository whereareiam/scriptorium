import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ServedPageArtifact } from "@scriptorium/server-api";

export async function writePageArtifact(
  pageArtifactsDir: string,
  relativeArtifactPath: string,
  artifact: ServedPageArtifact
) {
  const outputPath = path.join(pageArtifactsDir, relativeArtifactPath);
  const body = JSON.stringify(artifact);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, body);

  return Buffer.byteLength(body);
}
