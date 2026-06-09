import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { create, insertMultiple, save } from "@orama/orama";
import type { ServedBundleManifest } from "@scriptorium/server-api";
import type { StagedBundle } from "../../build-project-bundle";
import { buildAdvancedIndex } from "./build-advanced-index";
import { buildBreadcrumbs } from "./build-breadcrumbs";
import { buildSearchDocuments } from "./build-search-documents";
import { loadSearchSource } from "../load-search-source";
import { searchSchema } from "../model/search-database";

export async function buildSearchArtifacts(
  bundle: StagedBundle,
  generationDir: string
): Promise<ServedBundleManifest> {
  const searchDir = path.join(generationDir, "search");
  await mkdir(searchDir, { recursive: true });

  const versions: ServedBundleManifest["versions"] = [];

  for (const version of bundle.versions) {
    const source = await loadSearchSource(bundle, version.name);
    const searchDatabase = create({
      schema: searchSchema
    });

    for (const page of source.getPages()) {
      const index = await buildAdvancedIndex(page);
      const breadcrumbs = index.breadcrumbs ?? buildBreadcrumbs(source, page);
      await insertMultiple(searchDatabase, buildSearchDocuments({
        ...index,
        breadcrumbs
      }));
    }

    const searchIndexPath = path.join(searchDir, `${version.slug}.json`);
    await writeFile(searchIndexPath, JSON.stringify({
      type: "advanced",
      ...save(searchDatabase)
    }));

    versions.push({
      name: version.name,
      slug: version.slug,
      kind: version.kind,
      contentDir: version.contentDir,
      searchIndexPath
    });
  }

  return {
    formatVersion: 1,
    generatedAt: bundle.generatedAt,
    project: bundle.project,
    currentAssetsDir: bundle.currentAssetsDir,
    versions
  };
}
