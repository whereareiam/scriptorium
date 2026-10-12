export type ServedPageTranslationState = "translated" | "outdated" | "untranslated";

/** How a page of a translated language relates to its page in the default language. */
export interface ServedPageTranslation {
  language: string;
  /**
   * - `translated`: the translation follows the current default-language page.
   * - `outdated`: the default-language page changed after it was translated.
   * - `untranslated`: no translation exists, the default-language page is shown.
   */
  state: ServedPageTranslationState;
}
