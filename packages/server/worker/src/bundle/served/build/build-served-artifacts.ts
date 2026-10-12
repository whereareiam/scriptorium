import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { create, insertMultiple, save } from "@orama/orama";
import type { PrepareRequest } from "@scriptorium/server-worker-api";
import {
  getDefaultLanguage,
  toDocsBasePath,
  toSearchLanguage,
  type ServedBundleManifest,
  type ServedBundleTranslation,
  type ServedBundleVersion
} from "@scriptorium/server-api";
import type { StagedBundle, StagedTranslation } from "../../build-project-bundle";
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
  options.setPhase("preparing-content");

  const versions: ServedBundleVersion[] = [];
  const totals: EditionTotals = {
    artifactBytes: 0,
    pageCount: 0,
    searchDocumentCount: 0
  };

  for (const [index, version] of bundle.versions.entries()) {
    const refStartedAt = Date.now();
    options.logger?.emit("bundle_ref_started", {
      run_id: path.basename(generationDir),
      trigger_reason: options.request?.reason,
      event_name: options.request?.event,
      ref_name: version.name
    });

    const defaultEdition = await buildEdition(bundle, version, generationDir, totals, options);
    const translations: ServedBundleTranslation[] = [];
    for (const translation of version.translations) {
      options.setPhase("preparing-content");
      const edition = await buildEdition(
        bundle,
        version,
        path.join(generationDir, "translations", translation.language),
        totals,
        options,
        translation
      );
      translations.push({
        language: translation.language,
        ...edition
      });
    }

    versions.push({
      name: version.name,
      slug: version.slug,
      kind: version.kind,
      ...defaultEdition,
      ...(translations.length > 0 ? { translations } : {})
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
    artifact_bytes: totals.artifactBytes,
    page_count: totals.pageCount,
    ref_count: versions.length,
    search_document_count: totals.searchDocumentCount
  };
}

interface EditionTotals {
  artifactBytes: number;
  pageCount: number;
  searchDocumentCount: number;
}

/**
 * Prepares the pages, sidebar and search index of one edition of a version: the default
 * language when `translation` is absent, otherwise that translated language.
 */
async function buildEdition(
  bundle: StagedBundle,
  version: StagedBundle["versions"][number],
  rootDir: string,
  totals: EditionTotals,
  options: {
    setPhase: (phase: "preparing-content" | "preparing-search") => void;
  },
  translation?: StagedTranslation
) {
  const searchDir = path.join(rootDir, "search");
  const pageIndexesDir = path.join(rootDir, "page-indexes");
  const pageTreesDir = path.join(rootDir, "page-trees");
  const pageArtifactsRootDir = path.join(rootDir, "page-artifacts");
  await Promise.all([
    mkdir(searchDir, { recursive: true }),
    mkdir(pageIndexesDir, { recursive: true }),
    mkdir(pageTreesDir, { recursive: true }),
    mkdir(pageArtifactsRootDir, { recursive: true })
  ]);

  const source = await loadSearchSource(bundle, version.name, translation
    ? {
        contentDir: translation.contentDir,
        baseUrl: toDocsBasePath(bundle.project, translation.language)
      }
    : {});
  const builtPages = await buildPageArtifacts(source, version.slug, translation);
  const pageArtifactsDir = path.join(pageArtifactsRootDir, version.slug);
  const pageIndexPath = path.join(pageIndexesDir, `${version.slug}.json`);
  const pageTreePath = path.join(pageTreesDir, `${version.slug}.json`);

  for (const builtPage of builtPages.artifacts) {
    totals.artifactBytes += await writePageArtifact(
      pageArtifactsDir,
      builtPage.entry.artifactPath,
      builtPage.artifact
    );
  }

  totals.artifactBytes += await writePageIndex(
    pageIndexPath,
    builtPages.artifacts.map((entry) => entry.entry)
  );
  totals.artifactBytes += await writePageTree(pageTreePath, builtPages.tree);
  totals.pageCount += builtPages.artifacts.length;

  options.setPhase("preparing-search");
  const searchDatabase = create({
    schema: searchSchema,
    language: toSearchLanguage(translation?.language ?? getDefaultLanguage(bundle.project))
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
    totals.searchDocumentCount += documents.length;
    await insertMultiple(searchDatabase, documents);
  }

  const searchIndexPath = path.join(searchDir, `${version.slug}.json`);
  const searchBody = JSON.stringify({
    type: "advanced",
    ...save(searchDatabase)
  });
  await writeFile(searchIndexPath, searchBody);
  totals.artifactBytes += Buffer.byteLength(searchBody);

  return {
    pageIndexPath,
    pageTreePath,
    pageArtifactsDir,
    searchIndexPath
  };
}
