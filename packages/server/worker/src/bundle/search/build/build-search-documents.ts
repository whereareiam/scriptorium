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

  const { headings, contents } = page.structuredData;
  for (const heading of headings) {
    documents.push({
      id: `${page.id}::${documents.length}`,
      page_id: page.id,
      type: "heading",
      content: heading.content,
      breadcrumbs: page.breadcrumbs,
      tags,
      url: `${page.url}#${heading.id}`
    });
  }

  for (const content of contents) {
    documents.push({
      id: `${page.id}::${documents.length}`,
      page_id: page.id,
      type: "text",
      content: content.content,
      breadcrumbs: page.breadcrumbs,
      tags,
      url: content.heading ? `${page.url}#${content.heading}` : page.url
    });
  }

  return documents;
}
