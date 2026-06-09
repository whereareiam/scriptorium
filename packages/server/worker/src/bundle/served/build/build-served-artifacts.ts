import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { create, insertMultiple, save } from "@orama/orama";
import type { PrepareRequest } from "@scriptorium/server-worker-api";
import type { ServedBundleManifest, ServedBundleVersion } from "@scriptorium/server-api";
import type { StagedBundle } from "../../build-project-bundle";
import { buildAdvancedIndex } from "../../search/build/build-advanced-index";
import { buildBreadcrumbs } from "../../search/build/build-breadcrumbs";
import { buildSearchDocuments } from "../../search/build/build-search-documents";
import { loadSearchSource } from "../../search/load-search-source";
import { searchSchema } from "../../search/model/search-database";
import type { BundlingLogger } from "../../../preparation/logging/bundling-logger";
import { buildPageArtifacts } from "./build-page-artifacts";
import { writePageArtifact } from "../write/write-page-artifact";
import { writePageIndex } from "../write/write-page-index";
import { writePageTree } from "../write/write-page-tree";

export interface BuiltServedArtifacts {
  manifest: ServedBundleManifest;
  artifact_bytes: number;
  page_count: number;
  ref_count: number;
  search_document_count: number;
}

export async function buildServedArtifacts(
  bundle: StagedBundle,
  generationDir: string,
  options: {
    logger?: BundlingLogger;
    request?: PrepareRequest;
    setPhase: (phase: "preparing-content" | "preparing-search") => void;
  }
): Promise<BuiltServedArtifacts> {
  const searchDir = path.join(generationDir, "search");
  const pageIndexesDir = path.join(generationDir, "page-indexes");
  const pageTreesDir = path.join(generationDir, "page-trees");
  const pageArtifactsRootDir = path.join(generationDir, "page-artifacts");
  await Promise.all([
    mkdir(searchDir, { recursive: true }),
    mkdir(pageIndexesDir, { recursive: true }),
    mkdir(pageTreesDir, { recursive: true }),
    mkdir(pageArtifactsRootDir, { recursive: true })
  ]);

  options.setPhase("preparing-content");

  const versions: ServedBundleVersion[] = [];
  let artifactBytes = 0;
  let pageCount = 0;
  let searchDocumentCount = 0;

  for (const [index, version] of bundle.versions.entries()) {
    const refStartedAt = Date.now();
    options.logger?.emit("bundle_ref_started", {
      run_id: path.basename(generationDir),
      trigger_reason: options.request?.reason,
      event_name: options.request?.event,
      ref_name: version.name
    });

    const source = await loadSearchSource(bundle, version.name);
    const builtPages = await buildPageArtifacts(source, version.slug);
    const pageArtifactsDir = path.join(pageArtifactsRootDir, version.slug);
    const pageIndexPath = path.join(pageIndexesDir, `${version.slug}.json`);
    const pageTreePath = path.join(pageTreesDir, `${version.slug}.json`);

    for (const builtPage of builtPages.artifacts) {
      artifactBytes += await writePageArtifact(
        pageArtifactsDir,
        builtPage.entry.artifactPath,
        builtPage.artifact
      );
    }

    artifactBytes += await writePageIndex(
      pageIndexPath,
      builtPages.artifacts.map((entry) => entry.entry)
    );
    artifactBytes += await writePageTree(pageTreePath, builtPages.tree);
    pageCount += builtPages.artifacts.length;

    options.setPhase("preparing-search");
    const searchDatabase = create({
      schema: searchSchema
    });

    for (const page of source.getPages()) {
      const builtPage = builtPages.artifacts.find((entry) => entry.artifact.url === page.url);
      if (!builtPage) {
        continue;
      }

      const index = await buildAdvancedIndex({
        path: page.path,
        url: page.url,
        data: {
          title: page.data.title,
          description: page.data.description,
          structuredData: builtPage.artifact.renderer.structuredData as any
        }
      });
      const breadcrumbs = index.breadcrumbs ?? buildBreadcrumbs(source, page);
      const documents = buildSearchDocuments({
        ...index,
        breadcrumbs
      });
      searchDocumentCount += documents.length;
      await insertMultiple(searchDatabase, documents);
    }

    const searchIndexPath = path.join(searchDir, `${version.slug}.json`);
    const searchBody = JSON.stringify({
      type: "advanced",
      ...save(searchDatabase)
    });
    await writeFile(searchIndexPath, searchBody);
    artifactBytes += Buffer.byteLength(searchBody);

    versions.push({
      name: version.name,
      slug: version.slug,
      kind: version.kind,
      pageIndexPath,
      pageTreePath,
      pageArtifactsDir,
      searchIndexPath
    });
    options.logger?.emit("bundle_ref_finished", {
      run_id: path.basename(generationDir),
      trigger_reason: options.request?.reason,
      event_name: options.request?.event,
      ref_name: version.name,
      duration_ms: Date.now() - refStartedAt
    });

    if (index < bundle.versions.length - 1) {
      options.setPhase("preparing-content");
    }
  }

  return {
    manifest: {
      generatedAt: bundle.generatedAt,
      project: bundle.project,
      currentAssetsDir: bundle.currentAssetsDir,
      versions
    },
    artifact_bytes: artifactBytes,
    page_count: pageCount,
    ref_count: versions.length,
    search_document_count: searchDocumentCount
  };
}
