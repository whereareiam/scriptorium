import path from "node:path";
import type { AdvancedIndex } from "fumadocs-core/search/server";

export async function buildAdvancedIndex(page: {
  path: string;
  url: string;
  data: {
    title?: string;
    description?: string;
    structuredData?: AdvancedIndex["structuredData"] | (() => Promise<AdvancedIndex["structuredData"]>);
    load?: () => Promise<{ structuredData?: AdvancedIndex["structuredData"] }>;
  };
}): Promise<AdvancedIndex> {
  let structuredData: AdvancedIndex["structuredData"] | undefined;

  if ("structuredData" in page.data) {
    structuredData = typeof page.data.structuredData === "function"
      ? await page.data.structuredData()
      : page.data.structuredData;
  } else if ("load" in page.data && typeof page.data.load === "function") {
    structuredData = (await page.data.load()).structuredData;
  }

  if (!structuredData) {
    throw new Error("Cannot find structured data from page, please define the page to index function.");
  }

  return {
    title: page.data.title ?? fileNameWithoutExtension(page.path),
    description: page.data.description,
    url: page.url,
    id: page.url,
    structuredData
  };
}

function fileNameWithoutExtension(filePath: string) {
  return path.basename(filePath).replace(/\.[^.]+$/, "");
}
