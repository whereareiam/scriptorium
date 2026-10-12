/** Orama tokenizer languages by language code; Orama names them in English. */
const SEARCH_LANGUAGES: Record<string, string> = {
  ar: "arabic",
  bg: "bulgarian",
  cs: "czech",
  da: "danish",
  de: "german",
  el: "greek",
  en: "english",
  es: "spanish",
  fi: "finnish",
  fr: "french",
  hu: "hungarian",
  id: "indonesian",
  it: "italian",
  lt: "lithuanian",
  nl: "dutch",
  no: "norwegian",
  pt: "portuguese",
  ro: "romanian",
  ru: "russian",
  sr: "serbian",
  sv: "swedish",
  ta: "tamil",
  tr: "turkish",
  uk: "ukrainian"
};

/**
 * The Orama language that splits a language's words, so the index built on the server and
 * the database the search dialog loads it into tokenize the same way. Unknown languages
 * fall back to Orama's English tokenizer.
 */
export function toSearchLanguage(language: string) {
  return SEARCH_LANGUAGES[language.split("-")[0]] ?? "english";
}
