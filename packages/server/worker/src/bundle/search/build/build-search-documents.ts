import type { AdvancedIndex } from "fumadocs-core/search/server";
import type { SearchDocument } from "../model/search-document";

export function buildSearchDocuments(page: AdvancedIndex): SearchDocument[] {
  const pageTag = page.tag ?? [];
  const tags = Array.isArray(pageTag) ? pageTag : [pageTag];
  const documents: SearchDocument[] = [{
    id: page.id,
    page_id: page.id,
    type: "page",
    content: page.title,
    breadcrumbs: page.breadcrumbs,
    tags,
    url: page.url
  }];

  if (page.description) {
    documents.push({
      id: `${page.id}::description`,
      page_id: page.id,
      type: "text",
      content: page.description,
      breadcrumbs: page.breadcrumbs,
      tags,
      url: page.url
    });
  }

  const structuredItems = Array.isArray(page.structuredData)
    ? page.structuredData
    : [page.structuredData];

  for (const item of structuredItems) {
    documents.push({
      id: `${page.id}::${documents.length}`,
      page_id: page.id,
      type: item.type,
      content: item.content,
      breadcrumbs: item.breadcrumbs,
      tags,
      url: item.id ?? page.url
    });
  }

  return documents;
}
