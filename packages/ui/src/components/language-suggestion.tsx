"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { getInterfaceText } from "../language/interface-text";
import { readLanguageChoice, rememberLanguageChoice } from "../language/language-choice";
import { toLanguagePathname } from "../language/language-pathname";

export interface LanguageSuggestionProps {
  language: string;
  defaultLanguage: string;
  /** Languages the current version is published in. */
  languages: string[];
}

/**
 * Offers the reader's preferred language once, in that language, when the docs are
 * available in it. Nothing is shown after the reader picked a language or closed the offer.
 * It is decided in the browser, so cached pages stay the same for every reader.
 */
export function LanguageSuggestion({ language, defaultLanguage, languages }: LanguageSuggestionProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [suggested, setSuggested] = useState<string>();

  useEffect(() => {
    if (readLanguageChoice()) {
      return;
    }

    setSuggested(findPreferredLanguage(navigator.languages, languages, language));
  }, [language, languages]);

  if (!suggested) {
    return null;
  }

  const text = getInterfaceText(suggested).scriptorium;
  return (
    <div
      lang={suggested}
      className="sticky top-0 z-40 flex h-12 flex-row items-center justify-center gap-2 bg-fd-secondary px-10 text-center text-sm font-medium"
    >
      <style>{`:root { --fd-banner-height: 3rem; }`}</style>
      <span>{text.languageSuggestion}</span>
      <button
        type="button"
        className="font-medium underline underline-offset-4"
        onClick={() => {
          rememberLanguageChoice(suggested);
          router.push(toLanguagePathname(pathname, suggested, defaultLanguage));
        }}
      >
        {text.languageSuggestionAction}
      </button>
      <button
        type="button"
        aria-label="Close"
        className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-fd-muted-foreground/60 hover:bg-fd-accent hover:text-fd-accent-foreground"
        onClick={() => {
          rememberLanguageChoice(language);
          setSuggested(undefined);
        }}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

/** The first browser language the docs exist in, if it isn't the one being read. */
function findPreferredLanguage(preferred: readonly string[], available: string[], current: string) {
  for (const entry of preferred) {
    const match = available.find((language) => language === entry || language === entry.split("-")[0]);
    if (match) {
      return match === current ? undefined : match;
    }
  }

  return undefined;
}
