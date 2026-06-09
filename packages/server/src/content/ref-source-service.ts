import { localMd, type LocalMarkdownPage } from "@fumadocs/local-md";
import { loader, type LoaderPlugin, type MetaData, type VirtualFile } from "fumadocs-core/source";
import type { Root as PageTreeRoot } from "fumadocs-core/page-tree";
import { remarkSteps } from "fumadocs-core/mdx-plugins";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { getRefMetadata, toRefSlug, type ServedBundleManifest, type ServedBundleVersion } from "@scriptorium/server-api";

type CombinedPageData = LocalMarkdownPage<Record<string, unknown>, Record<string, unknown>>;
type CombinedMetaData = MetaData;
type CombinedVirtualFile = VirtualFile<{
  pageData: CombinedPageData;
  metaData: CombinedMetaData;
}>;

export type ServerDocsSource = Awaited<ReturnType<RefSourceService["getSource"]>>;

interface CachedSource {
  key: string;
  value: Promise<any>;
}

export class RefSourceService {
  private readonly sources = new Map<string, CachedSource>();
  private readonly lru: string[] = [];

  async getSource(bundle: ServedBundleManifest, refName: string) {
    const version = resolveVersion(bundle, refName);
    const cacheKey = `${bundle.generatedAt}:${version.name}`;
    const cached = this.sources.get(cacheKey);
    if (cached) {
      this.bump(cacheKey);
      return cached.value;
    }

    const source = this.loadSource(bundle, version);
    this.sources.set(cacheKey, {
      key: cacheKey,
      value: source
    });
    this.bump(cacheKey);
    this.evict();
    return source;
  }

  async getSidebarTree(bundle: ServedBundleManifest, refName: string): Promise<PageTreeRoot> {
    const source = await this.getSource(bundle, refName);
    const refSlug = toRefSlug(refName);
    const tree = source.getPageTree() as any;
    const folder = tree.children.find((node: any) => node.type === "folder" && node.$ref === `${refSlug}/meta.json`) as any;
    if (!folder) {
      return tree;
    }

    return {
      ...tree,
      name: folder.name,
      children: folder.children ?? []
    };
  }

  private async loadSource(bundle: ServedBundleManifest, version: ServedBundleVersion) {
    const docs = localMd({
      dir: version.contentDir,
      include: ["**/*.{md,mdx,json}"],
      mdxOptions: {
        remarkPlugins: [remarkSteps]
      }
    });
    const staticSource = await docs.staticSource();
    const refSlug = toRefSlug(version.name);
    const refLabel = getRefMetadata(bundle.project, version.name).label;
    const files = prefixRefFiles(staticSource.files, refSlug, refLabel);

    return loader({ files }, {
      baseUrl: "/docs",
      plugins: [
        lucideIconsPlugin(),
        disableLeafFolderCollapsingPlugin()
      ]
    });
  }

  private bump(cacheKey: string) {
    const index = this.lru.indexOf(cacheKey);
    if (index >= 0) {
      this.lru.splice(index, 1);
    }

    this.lru.push(cacheKey);
  }

  private evict() {
    while (this.lru.length > 2) {
      const removed = this.lru.shift();
      if (removed) {
        this.sources.delete(removed);
      }
    }
  }
}

function resolveVersion(bundle: ServedBundleManifest, refName: string) {
  const version = bundle.versions.find((entry) => entry.name === refName);
  if (!version) {
    throw new Error(`Unknown bundled ref "${refName}".`);
  }

  return version;
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
