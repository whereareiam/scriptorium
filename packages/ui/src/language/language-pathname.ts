export interface DocsPathname {
  /** The language prefix, absent for the default language. */
  language?: string
  refSlug?: string
  /** Segments after the version. */
  pageSegments: string[]
}

/** Splits `/docs/<ref>/...` and `/<language>/docs/<ref>/...` into their parts. */
export function parseDocsPathname(pathname: string): DocsPathname | undefined {
  const segments = pathname.split('/').filter(Boolean)
  const docsIndex = segments[0] === 'docs' ? 0 : segments[1] === 'docs' ? 1 : -1
  if (docsIndex < 0) {
    return undefined
  }

  return {
    language: docsIndex === 1 ? segments[0] : undefined,
    refSlug: segments[docsIndex + 1],
    pageSegments: segments.slice(docsIndex + 2),
  }
}

/** The same docs page in another language; the default language has no prefix. */
export function toLanguagePathname(pathname: string, language: string, defaultLanguage: string) {
  const parsed = parseDocsPathname(pathname)
  const prefix = language === defaultLanguage ? '' : `/${language}`
  if (!parsed) {
    return `${prefix}/docs`
  }

  const rest = [parsed.refSlug, ...parsed.pageSegments].filter(Boolean).join('/')
  return `${prefix}/docs${rest ? `/${rest}` : ''}`
}
