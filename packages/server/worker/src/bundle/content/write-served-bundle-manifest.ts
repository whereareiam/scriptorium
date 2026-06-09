import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ServedBundleManifest } from "@scriptorium/server-api";

export async function writeServedBundleManifest(
  bundleDir: string,
  manifest: ServedBundleManifest
) {
  await mkdir(bundleDir, { recursive: true });
  await writeFile(path.join(bundleDir, "manifest.json"), JSON.stringify(manifest, null, 2));
}
