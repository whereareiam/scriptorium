import type { ScriptoriumProjectConfig } from "./models/scriptorium-project-config";

const FALLBACK_LANGUAGE = "en";

export function getDefaultLanguage(config: ScriptoriumProjectConfig) {
  return config.i18n?.default ?? FALLBACK_LANGUAGE;
}

/** Languages that are translated from the default one, in configuration order. */
export function getTranslationLanguages(config: ScriptoriumProjectConfig) {
  const defaultLanguage = getDefaultLanguage(config);
  return Object.keys(config.i18n?.languages ?? {}).filter((language) => language !== defaultLanguage);
}

export function getLanguageLabel(config: ScriptoriumProjectConfig, language: string) {
  return config.i18n?.languages[language]?.label ?? language;
}

/** The docs root of a language: the default language keeps the unprefixed `/docs`. */
export function toDocsBasePath(config: ScriptoriumProjectConfig, language?: string) {
  if (!language || language === getDefaultLanguage(config)) {
    return "/docs";
  }

  return `/${language}/docs`;
}
