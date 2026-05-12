import { createFromSource } from "fumadocs-core/search/server";
import type { DocsSource } from "@scriptorium/content";

let cachedSearchSource: Promise<DocsSource> | null = null;
let warmedSearchIndex: Promise<void> | null = null;

export function createSearchRuntime(getSource: () => Promise<{ source: DocsSource }>) {
  function getSearchSource() {
    cachedSearchSource ??= getSource().then(({ source }) => source);
    return cachedSearchSource;
  }

  const searchHandler = createFromSource(getSearchSource);

  function warmSearchIndex() {
    warmedSearchIndex ??= searchHandler.staticGET()
      .then(() => undefined)
      .catch(() => undefined);

    return warmedSearchIndex;
  }

  return {
    searchHandler,
    warmSearchIndex
  };
}
