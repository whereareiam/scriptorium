import type { SearchSource } from "../load-search-source";

export function buildBreadcrumbs(source: SearchSource, page: {
  url: string;
}) {
  const segments = page.url.split("/").filter(Boolean);
  const tree = source.getPageTree() as any;
  const breadcrumbs: string[] = [];
  let nodes = tree.children;

  for (const segment of segments) {
    const match = nodes.find((node: any) => node.url?.split("/").filter(Boolean).at(-1) === segment || node.name === segment);
    if (!match) {
      continue;
    }

    breadcrumbs.push(match.name);
    nodes = match.children ?? [];
  }

  return breadcrumbs;
}
