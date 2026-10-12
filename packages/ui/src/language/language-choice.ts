const STORAGE_KEY = 'scriptorium:language'

/** Remembers the language a reader picked; browser storage may be unavailable. */
export function rememberLanguageChoice(language: string) {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Private windows and blocked storage only lose the convenience.
  }
}

export function readLanguageChoice() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? undefined
  } catch {
    return undefined
  }
}
