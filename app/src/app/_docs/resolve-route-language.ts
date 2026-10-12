import { notFound, redirect } from "next/navigation";
import { getDefaultLanguage, getTranslationLanguages, hasUsableContent } from "@scriptorium/server-api";
import { getProjectConfig, getRuntimeReadiness } from "@/scriptorium";

/**
 * The translated language a `/<language>/docs` route serves. The default language has no
 * prefix and redirects there; a language the project doesn't publish is not found.
 */
export async function resolveRouteLanguage(language: string, slug: string[] = []) {
  const readiness = await getRuntimeReadiness();
  if (!hasUsableContent(readiness)) {
    return language;
  }

  const project = await getProjectConfig();
  if (language === getDefaultLanguage(project)) {
    redirect(["/docs", ...slug].join("/"));
  }

  if (!getTranslationLanguages(project).includes(language)) {
    notFound();
  }

  return language;
}
