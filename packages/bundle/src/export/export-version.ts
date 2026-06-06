import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getContractPrefixes, type SourceRef, type StageRepository } from "@scriptorium/core";
import type { BundledVersion } from "../models/bundled-version";

function resolveBundledDestination(filePath: string, versionRoot: string, projectRoot: string, repoRoot: string) {
  const prefixes = getContractPrefixes(projectRoot, repoRoot);

  if (filePath.startsWith(prefixes.contentPrefix)) {
    return path.join(versionRoot, "content", filePath.slice(prefixes.contentPrefix.length));
  }

  if (filePath.startsWith(prefixes.assetsPrefix)) {
    return path.join(versionRoot, "assets", filePath.slice(prefixes.assetsPrefix.length));
  }

  return path.join(versionRoot, "scriptorium.project.json");
}

export async function exportVersion(projectRoot: string, repository: StageRepository, ref: SourceRef, outputDir: string) {
  const versionRoot = path.join(outputDir, "versions", ref.name);
  const files = await repository.listFiles(ref.fullName, projectRoot);

  if (!files.some((entry) => entry.includes("/docs/content/") || entry.startsWith("docs/content/"))) {
    throw new Error(`Ref "${ref.name}" does not contain docs/content files.`);
  }

  await mkdir(versionRoot, { recursive: true });

  for (const filePath of files) {
    const destination = resolveBundledDestination(filePath, versionRoot, projectRoot, repository.repoRoot);
    await mkdir(path.dirname(destination), { recursive: true });
    const content = await repository.readFile(ref.fullName, filePath);
    await writeFile(destination, content);
  }

  return {
    name: ref.name,
    kind: ref.kind,
    fullName: ref.fullName,
    objectName: ref.objectName,
    contentDir: path.join(versionRoot, "content"),
    assetsDir: path.join(versionRoot, "assets"),
    configPath: path.join(versionRoot, "scriptorium.project.json")
  } satisfies BundledVersion;
}
