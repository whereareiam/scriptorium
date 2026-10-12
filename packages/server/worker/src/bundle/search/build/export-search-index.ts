import { initAdvancedSearch, type AdvancedIndex } from 'fumadocs-core/search/server'

/**
 * The search index of one edition as the browser loads it. The exported database keeps
 * Fumadocs' multilingual tokenizer, so every language is searched the way it was indexed.
 */
export async function exportSearchIndex(indexes: AdvancedIndex[]) {
  return JSON.stringify(await initAdvancedSearch({ indexes }).export())
}

/** The page, its description, and each heading and text block become their own search record. */
export function countSearchRecords(index: AdvancedIndex) {
  return (
    1 +
    (index.description ? 1 : 0) +
    index.structuredData.headings.length +
    index.structuredData.contents.length
  )
}
