import { readFile } from "node:fs/promises";
import path from "node:path";
import type { BundleManifest } from "./models/bundle-manifest";

export async function readBundleManifest(projectRoot = process.cwd(), outputDir = path.join(projectRoot, ".scriptorium", "bundle")) {
  const manifestPath = path.join(outputDir, "manifest.json");
  const raw = await readFile(manifestPath, "utf8");

  return JSON.parse(raw) as BundleManifest;
}
