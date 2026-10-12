import type { Translations } from 'fumadocs-ui/i18n'

/** Texts of Scriptorium's own interface, next to the Fumadocs ones. */
export interface ScriptoriumText {
  translationMissingTitle: string
  translationMissing: string
  translationOutdatedTitle: string
  translationOutdated: string
  openOriginal: string
  /** Offered in the suggested language itself, to readers whose browser prefers it. */
  languageSuggestion: string
  languageSuggestionAction: string
}

export interface InterfaceText {
  fumadocs: Partial<Translations>
  scriptorium: ScriptoriumText
}

const ENGLISH: InterfaceText = {
  fumadocs: {},
  scriptorium: {
    translationMissingTitle: 'Not translated yet',
    translationMissing: 'This page has no translation yet, so the original is shown.',
    translationOutdatedTitle: 'This translation may be out of date',
    translationOutdated:
      "The original page changed after it was translated. Check the original if something doesn't match.",
    openOriginal: 'Open the original',
    languageSuggestion: 'This documentation is available in English.',
    languageSuggestionAction: 'Switch to English',
  },
}

const RUSSIAN: InterfaceText = {
  fumadocs: {
    search: 'Поиск',
    searchNoResult: 'Ничего не найдено',
    toc: 'На этой странице',
    tocNoHeadings: 'Нет заголовков',
    lastUpdate: 'Обновлено',
    chooseLanguage: 'Выберите язык',
    nextPage: 'Следующая страница',
    previousPage: 'Предыдущая страница',
    chooseTheme: 'Тема',
    editOnGithub: 'Редактировать на GitHub',
  },
  scriptorium: {
    translationMissingTitle: 'Страница ещё не переведена',
    translationMissing: 'У этой страницы пока нет перевода, поэтому показан оригинал.',
    translationOutdatedTitle: 'Перевод может быть устаревшим',
    translationOutdated:
      'Оригинал страницы изменился после перевода. Если что-то не сходится, сверьтесь с оригиналом.',
    openOriginal: 'Открыть оригинал',
    languageSuggestion: 'Эта документация есть на русском языке.',
    languageSuggestionAction: 'Читать на русском',
  },
}

const TEXTS: Record<string, InterfaceText> = {
  en: ENGLISH,
  ru: RUSSIAN,
}

/** The interface texts of a language; languages without their own texts get the English ones. */
export function getInterfaceText(language: string): InterfaceText {
  return TEXTS[language] ?? TEXTS[language.split('-')[0]] ?? ENGLISH
}

/** Whether Scriptorium has interface texts of its own for a language, rather than English ones. */
export function hasInterfaceText(language: string) {
  return language in TEXTS || language.split('-')[0] in TEXTS
}
