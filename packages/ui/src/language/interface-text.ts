import type { Translations } from 'fumadocs-ui/i18n'
import type { SettingFlag } from '../components/setting'

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
  /** The accessible name of the version menu in the sidebar. */
  chooseVersion: string
  /** The section menu in the sidebar, on pages that belong to no section. */
  chooseSection: string
  /** Labels of the `<Setting>` component of configuration references. */
  setting: {
    takes: string
    default: string
    affects: string
    flags: Record<SettingFlag, string>
  }
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
    chooseVersion: 'Choose a version',
    chooseSection: 'Choose a section',
    setting: {
      takes: 'Takes',
      default: 'Default',
      affects: 'Affects',
      flags: {
        advanced: 'Advanced',
        warning: 'Warning',
        danger: 'Danger',
        experimental: 'Experimental',
        reserved: 'Reserved',
      },
    },
  },
}

const RUSSIAN: InterfaceText = {
  fumadocs: {
    'Ask AI(AI chat button)': 'Спросить ИИ',
    'Back to Home(404 page)': 'На главную',
    'Choose a language(language switcher)': 'Выберите язык',
    'Choose a language(language switcher)(aria-label)': 'Выбрать язык',
    'Close Banner(banner)(aria-label)': 'Закрыть баннер',
    'Close Search(search dialog)(aria-label)': 'Закрыть поиск',
    'Close Sidebar(aria-label)': 'Закрыть боковую панель',
    'Close Sidebar(sidebar)(aria-label)': 'Закрыть боковую панель',
    'Collapse Sidebar(sidebar)(aria-label)': 'Свернуть боковую панель',
    'Copied Anchor Link(heading anchor)(aria-label)': 'Ссылка на раздел скопирована',
    'Copied Link(accordion)(aria-label)': 'Ссылка скопирована',
    'Copied Markdown(page actions)': 'Markdown скопирован',
    'Copied Text(code block)(aria-label)': 'Текст скопирован',
    'Copy Anchor Link(heading anchor)(aria-label)': 'Скопировать ссылку на раздел',
    'Copy Link(accordion)(aria-label)': 'Скопировать ссылку',
    'Copy Markdown(page actions)': 'Скопировать Markdown',
    'Copy Text(code block)(aria-label)': 'Скопировать текст',
    'Dark(theme switcher)(aria-label)': 'Тёмная',
    'Default(type table)': 'По умолчанию',
    'Edit on GitHub(edit page)': 'Редактировать на GitHub',
    'Hide Sidebar(sidebar)': 'Скрыть боковую панель',
    'Last updated on(page footer)': 'Обновлено',
    'Layout Tab(layout tab trigger)': 'Раздел',
    'Light(theme switcher)(aria-label)': 'Светлая',
    'Next Page(pagination)': 'Следующая страница',
    'No Headings(table of contents)': 'Нет заголовков',
    'No results found(search dialog)': 'Ничего не найдено',
    'On this page(table of contents)': 'На этой странице',
    'Open Search(search trigger)(aria-label)': 'Открыть поиск',
    'Open Sidebar(sidebar)(aria-label)': 'Открыть боковую панель',
    'Open in ChatGPT(page actions)': 'Открыть в ChatGPT',
    'Open in Claude(page actions)': 'Открыть в Claude',
    'Open in Cursor(page actions)': 'Открыть в Cursor',
    'Open in GitHub(page actions)': 'Открыть на GitHub',
    'Open in Scira AI(page actions)': 'Открыть в Scira AI',
    'Open(page actions)': 'Открыть',
    'Page Not Found(404 page)': 'Страница не найдена',
    'Parameters(type table)': 'Параметры',
    'Previous Page(pagination)': 'Предыдущая страница',
    'Prop(type table)': 'Свойство',
    'Read {url}, I want to ask questions about it.(page actions)':
      'Прочитай {url}, я хочу задать вопросы по этой странице.',
    'Returns(type table)': 'Возвращает',
    'Search(search dialog)': 'Поиск',
    'Search(search trigger)': 'Поиск',
    'Show Sidebar(sidebar)': 'Показать боковую панель',
    'System(theme switcher)(aria-label)': 'Как в системе',
    'Table of Contents(inline table of contents)': 'Содержание',
    'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.(404 page)':
      'Страница, которую вы ищете, могла быть удалена, переименована или временно недоступна.',
    'Toggle Menu(mobile menu)(aria-label)': 'Открыть или закрыть меню',
    'Toggle Theme(theme switcher)(aria-label)': 'Сменить тему',
    'Type(type table)': 'Тип',
    'View as Markdown(page actions)': 'Открыть как Markdown',
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
    chooseVersion: 'Выбрать версию',
    chooseSection: 'Выберите раздел',
    setting: {
      takes: 'Принимает',
      default: 'По умолчанию',
      affects: 'Влияет на',
      flags: {
        advanced: 'Для опытных',
        warning: 'Осторожно',
        danger: 'Опасно',
        experimental: 'Экспериментально',
        reserved: 'Зарезервировано',
      },
    },
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
