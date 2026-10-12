import type { ReactNode } from "react";
import { DocsLayoutView } from "../../../_docs/docs-layout-view";
import { resolveRouteLanguage } from "../../../_docs/resolve-route-language";

export default async function TranslatedDocsLayoutRoute(
  {
    children,
    params
  }: {
    children: ReactNode;
    params: Promise<{ lang: string; slug?: string[] }>;
  }
) {
  const { lang, slug } = await params;
  const language = await resolveRouteLanguage(lang, slug);
  return <DocsLayoutView slug={slug} language={language}>{children}</DocsLayoutView>;
}
