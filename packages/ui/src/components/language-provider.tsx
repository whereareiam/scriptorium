"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { I18nProvider } from "fumadocs-ui/contexts/i18n";
import type { Translations } from "fumadocs-ui/i18n";
import { rememberLanguageChoice } from "../language/language-choice";
import { toLanguagePathname } from "../language/language-pathname";

export interface LanguageProviderProps {
  language: string;
  defaultLanguage: string;
  /** Languages the current version is published in, shown in the language menu. */
  languages: Array<{ locale: string; name: string }>;
  translations: Partial<Translations>;
  children: ReactNode;
}

/**
 * Supplies the language menu of the docs layout. Switching keeps the reader on the same
 * page and version and remembers the choice, so the language suggestion stays quiet.
 */
export function LanguageProvider({ language, defaultLanguage, languages, translations, children }: LanguageProviderProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <I18nProvider
      locale={language}
      locales={languages}
      translations={translations}
      onLocaleChange={(nextLanguage) => {
        rememberLanguageChoice(nextLanguage);
        router.push(toLanguagePathname(pathname, nextLanguage, defaultLanguage));
      }}
    >
      {children}
    </I18nProvider>
  );
}
