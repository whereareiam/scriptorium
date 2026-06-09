import { create } from "@orama/orama";

export const searchSchema = {
  content: "string",
  page_id: "string",
  type: "string",
  breadcrumbs: "string[]",
  tags: "enum[]",
  url: "string",
  embeddings: "vector[512]"
} as const;

export type SearchDatabase = ReturnType<typeof create<typeof searchSchema>>;
