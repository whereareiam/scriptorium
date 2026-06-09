export interface SearchDocument {
  id: string;
  page_id: string;
  type: "page" | "text" | "heading";
  content: string;
  breadcrumbs?: string[];
  tags: string[];
  url: string;
}
