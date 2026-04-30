import type { Root as PageTreeRoot, Folder as PageTreeFolder } from "fumadocs-core/page-tree";
import { toRefSlug } from "./ref-slugs";

export interface DocsSourceLike {
  getPageTree(): PageTreeRoot;
  getPages(): Array<{
    slugs: string[];
    url: string;
  }>;
}

export function getRefUrl(source: DocsSourceLike, refName: string) {
  const refSlug = toRefSlug(refName);
  const folder = findRefFolder(source.getPageTree(), refSlug);

  if (folder?.index?.url) {
    return folder.index.url;
  }

  const page = source.getPages().find((entry) => entry.slugs[0] === refSlug);
  if (page) {
    return page.url;
  }

  return `/docs/${refSlug}`;
}

function findRefFolder(tree: PageTreeRoot, refSlug: string) {
  return tree.children.find((node): node is PageTreeFolder => {
    return node.type === "folder" && node.$ref === `${refSlug}/meta.json`;
  });
}
