import { localMd, type LocalMarkdownPage } from "@fumadocs/local-md";
import { loader, type LoaderPlugin, type MetaData, type VirtualFile } from "fumadocs-core/source";
import { remarkSteps } from "fumadocs-core/mdx-plugins";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { getRefMetadata } from "@scriptorium/server-api";
import type { StagedBundle } from "../build-project-bundle";

type CombinedPageData = LocalMarkdownPage;
type CombinedMetaData = MetaData;
type CombinedVirtualFile = VirtualFile<{
  pageData: CombinedPageData;
  metaData: CombinedMetaData;
}>;

export type SearchSource = Awaited<ReturnType<typeof loadSearchSource>>;

export async function loadSearchSource(bundle: StagedBundle, refName: string) {
  const version = bundle.versions.find((entry) => entry.name === refName);
  if (!version) {
    throw new Error(`Unknown bundled ref "${refName}".`);
  }

  const docs = localMd({
    dir: version.contentDir,
    include: ["**/*.{md,mdx,json}"],
    mdxOptions: {
      remarkPlugins: [remarkSteps]
    }
  });
  const staticSource = await docs.staticSource();
  const refLabel = getRefMetadata(bundle.project, refName).label;
  const files = prefixRefFiles(staticSource.files, version.slug, refLabel);

  return loader({ files }, {
    baseUrl: "/docs",
    plugins: [
      lucideIconsPlugin(),
      disableLeafFolderCollapsingPlugin()
    ]
  });
}

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

function prefixRefFiles(files: CombinedVirtualFile[], refSlug: string, refLabel: string) {
  return files.map((file) => prefixRefFile(file, refSlug, refLabel));
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
