import type { MarkdownRendererSerializedOptions } from "@fumadocs/local-md";
import type { LocalMarkdownPage } from "@fumadocs/local-md";
import type {
  ServedPageArtifact,
  ServedPageIndexEntry,
  ServedPageTocItem,
  ServedPageTreeFolder,
  ServedPageTreeNode,
  ServedPageTreePage,
  ServedPageTreeRoot,
  ServedPageTreeSeparator
} from "@scriptorium/server-api";
import type { SearchSource } from "../../search/load-search-source";

export interface BuiltPageArtifact {
  artifact: ServedPageArtifact;
  entry: ServedPageIndexEntry;
}

export interface BuiltPageArtifactsResult {
  artifacts: BuiltPageArtifact[];
  tree: ServedPageTreeRoot;
}

export async function buildPageArtifacts(
  source: SearchSource,
  refSlug: string
): Promise<BuiltPageArtifactsResult> {
  const artifacts: BuiltPageArtifact[] = [];

  for (const page of source.getPages()) {
    const renderer = await (page.data as LocalMarkdownPage<Record<string, unknown>, Record<string, unknown>>).load();
    const routeSegments = page.slugs as string[];
    const title = typeof page.data.title === "string" ? page.data.title : String(page.data.title ?? "");
    const description = typeof page.data.description === "string"
      ? page.data.description
      : page.data.description == null
        ? undefined
        : String(page.data.description);
    const artifactPath = toArtifactPath(routeSegments.slice(1));

    artifacts.push({
      artifact: {
        routeSegments,
        sourcePath: page.path,
        url: page.url,
        title,
        description,
        renderer: toServedRenderer(renderer.serialize())
      },
      entry: {
        routeSegments,
        sourcePath: page.path,
        url: page.url,
        title,
        description,
        artifactPath
      }
    });
  }

  return {
    artifacts,
    tree: serializeRoot(resolveSidebarTree(source, refSlug))
  };
}

export function toArtifactPath(routeSegments: string[]) {
  if (routeSegments.length === 0) {
    return "index.json";
  }

  return `${routeSegments.join("/")}/index.json`;
}

function toServedRenderer(renderer: MarkdownRendererSerializedOptions): ServedPageArtifact["renderer"] {
  if (renderer.type === "js") {
    return {
      kind: "js",
      code: renderer.code,
      filePath: renderer.filePath,
      baseUrl: renderer.baseUrl,
      structuredData: renderer.structuredData
    };
  }

  return {
    kind: "ast",
    tree: renderer.tree,
    filePath: renderer.filePath,
    rehypeToc: renderer.rehypeToc as ServedPageTocItem[] | undefined,
    structuredData: renderer.structuredData
  };
}

function resolveSidebarTree(source: SearchSource, refSlug: string) {
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

function serializeRoot(node: any): ServedPageTreeRoot {
  return {
    type: "root",
    name: toText(node.name),
    description: toOptionalText(node.description),
    children: (node.children ?? []).map(serializeNode)
  };
}

function serializeNode(node: any): ServedPageTreeNode {
  switch (node.type) {
    case "page":
      return serializePage(node);
    case "separator":
      return serializeSeparator(node);
    case "folder":
      return serializeFolder(node);
    default:
      return serializeSeparator({});
  }
}

function serializePage(node: any): ServedPageTreePage {
  return {
    type: "page",
    name: toText(node.name),
    url: node.url,
    external: node.external,
    description: toOptionalText(node.description)
  };
}

function serializeSeparator(node: any): ServedPageTreeSeparator {
  return {
    type: "separator",
    name: toOptionalText(node.name)
  };
}

function serializeFolder(node: any): ServedPageTreeFolder {
  return {
    type: "folder",
    name: toText(node.name),
    description: toOptionalText(node.description),
    root: node.root,
    defaultOpen: node.defaultOpen,
    collapsible: node.collapsible,
    index: node.index ? serializePage(node.index) : undefined,
    children: (node.children ?? []).map(serializeNode)
  };
}

function toText(value: unknown) {
  if (typeof value === "string")
    return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return "";
}

function toOptionalText(value: unknown) {
  const text = toText(value);
  return text === "" ? undefined : text;
}
