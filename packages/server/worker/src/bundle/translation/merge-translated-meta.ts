type MetaJson = Record<string, unknown> & {
  pages?: unknown;
  labels?: unknown;
};

const SEPARATOR_PATTERN = /^---(.*)---$/;
const LINK_PATTERN = /^((?:external:)?)\[([^\]]+)\]\((.+)\)$/;

/**
 * Lays a translated `meta.json` over the default-language one. The default language keeps
 * deciding which pages exist and in what order; a translation sets its own `title` and
 * `description` and translates separator and link texts through `labels`.
 */
export function mergeTranslatedMeta(defaultMeta: MetaJson, translatedMeta: MetaJson) {
  const { labels, pages: _pages, ...overrides } = translatedMeta;
  const merged: MetaJson = {
    ...defaultMeta,
    ...overrides
  };

  if (Array.isArray(defaultMeta.pages) && isLabelMap(labels)) {
    merged.pages = defaultMeta.pages.map((entry) => typeof entry === "string" ? translateEntry(entry, labels) : entry);
  }

  return merged;
}

function translateEntry(entry: string, labels: Record<string, string>) {
  const separator = SEPARATOR_PATTERN.exec(entry);
  if (separator) {
    const label = labels[separator[1]];
    return label ? `---${label}---` : entry;
  }

  const link = LINK_PATTERN.exec(entry);
  if (link) {
    const label = labels[link[2]];
    return label ? `${link[1]}[${label}](${link[3]})` : entry;
  }

  return entry;
}

function isLabelMap(value: unknown): value is Record<string, string> {
  return typeof value === "object"
    && value !== null
    && Object.values(value).every((label) => typeof label === "string");
}
