import type { Metadata } from "next";
import { buildDocsPageMetadata, DocsPageView } from "../../../_docs/docs-page-view";
import { resolveRouteLanguage } from "../../../_docs/resolve-route-language";

export const dynamic = "force-dynamic";

export default async function TranslatedDocsPageRoute(
  { params }: { params: Promise<{ lang: string; slug?: string[] }> }
) {
  const { lang, slug } = await params;
  const language = await resolveRouteLanguage(lang, slug);
  return <DocsPageView slug={slug} language={language} />;
}

export async function generateMetadata(
  { params }: { params: Promise<{ lang: string; slug?: string[] }> }
): Promise<Metadata> {
  const { lang, slug } = await params;
  const language = await resolveRouteLanguage(lang, slug);
  return buildDocsPageMetadata({ slug, language });
}
