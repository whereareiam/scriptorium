import { localMd, type LocalMarkdownPage } from "@fumadocs/local-md";
import { loader, type LoaderPlugin, type MetaData, type StaticSource, type VirtualFile } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { getRefMetadata, toRefSlug, type ScriptoriumProjectConfig } from "@scriptorium/core";
import type { BundleManifest } from "@scriptorium/bundle";
import { isPartialContentPath, PARTIALS_DIR_NAME, remarkPartialIncludes } from "../mdx/include-directive";

type CombinedPageData = LocalMarkdownPage<Record<string, unknown>, Record<string, unknown>>;
type CombinedMetaData = MetaData;
type CombinedSource = StaticSource<{
  pageData: CombinedPageData;
  metaData: CombinedMetaData;
}>;
type CombinedVirtualFile = VirtualFile<{
  pageData: CombinedPageData;
  metaData: CombinedMetaData;
}>;

export function createDocsSourceAccess(getBundledSite: (projectRoot?: string) => Promise<BundleManifest>) {
  async function loadSource(projectRoot?: string) {
    const bundle = await getBundledSite(projectRoot);
    const files: CombinedVirtualFile[] = [];

    for (const version of bundle.versions) {
      const docs = localMd({
        dir: version.contentDir,
        include: [
          "**/*.{md,mdx,json}",
          `!**/${PARTIALS_DIR_NAME}/**`
        ],
        mdxOptions: {
          remarkPlugins: [remarkPartialIncludes(version.contentDir)]
        }
      });
      const staticSource = await docs.staticSource();
      files.push(...prefixRefFiles(filterPublicFiles(staticSource), bundle.project, version.name));
    }

    const source = loader({ files }, {
      baseUrl: "/docs",
      plugins: [
        lucideIconsPlugin(),
        disableLeafFolderCollapsingPlugin()
      ]
    });

    return { source };
  }

  const sources = new Map<string, ReturnType<typeof loadSource>>();

  function getSource(projectRoot?: string) {
    const cacheKey = projectRoot ?? "";
    let source = sources.get(cacheKey);
    if (source) return source;

    source = loadSource(projectRoot);
    sources.set(cacheKey, source);
    return source;
  }

  function invalidate(projectRoot?: string) {
    if (projectRoot) {
      sources.delete(projectRoot);
      return;
    }

    sources.clear();
  }

  return {
    getSource,
    invalidate
  };
}

function filterPublicFiles(source: CombinedSource): CombinedSource {
  return {
    files: source.files.filter((file) => !isPartialContentPath(file.path))
  };
}

export type DocsSource = Awaited<ReturnType<ReturnType<typeof createDocsSourceAccess>["getSource"]>>["source"];

function disableLeafFolderCollapsingPlugin(): LoaderPlugin {
  return {
    name: "scriptorium:disable-leaf-folder-collapsing",
    transformPageTree: {
      folder(node) {
        if (node.index && node.children.length === 0 && node.collapsible === undefined) {
          return {
            ...node,
            collapsible: false
          };
        }

        return node;
      }
    }
  };
}

function prefixRefFiles(source: CombinedSource, project: ScriptoriumProjectConfig, refName: string) {
  const refSlug = toRefSlug(refName);
  const refLabel = getRefMetadata(project, refName).label;

  return source.files.map((file) => prefixRefFile(file, refSlug, refLabel));
}

function prefixRefFile(file: CombinedVirtualFile, refSlug: string, refLabel: string): CombinedVirtualFile {
  if (file.type === "meta" && file.path === "meta.json") {
    const { description: _description, ...restData } = file.data;

    return {
      ...file,
      path: `${refSlug}/meta.json`,
      data: {
        ...restData,
        title: refLabel,
        root: true
      }
    };
  }

  return {
    ...file,
    path: `${refSlug}/${file.path}`
  };
}
