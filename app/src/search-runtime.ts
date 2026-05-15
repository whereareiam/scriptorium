import { createFromSource } from "fumadocs-core/search/server";
import type { DocsSource } from "@scriptorium/content";

export function createSearchRuntime(getSource: () => Promise<{ source: DocsSource }>) {
  let cachedSearchSource: Promise<DocsSource> | null = null;
  let warmedSearchIndex: Promise<void> | null = null;

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

  function invalidate() {
    cachedSearchSource = null;
    warmedSearchIndex = null;
  }

  return {
    searchHandler,
    warmSearchIndex,
    invalidate
  };
}
