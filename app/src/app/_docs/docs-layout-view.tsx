import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { LinkItemType } from "fumadocs-ui/layouts/shared";
import type { ProjectLink, PublishedVersion, ScriptoriumProjectConfig } from "@scriptorium/server-api";
import {
  getDefaultLanguage,
  getLanguageLabel,
  hasUsableContent,
  toDocsBasePath,
  toRefSlug
} from "@scriptorium/server-api";
import { getProjectConfig, getPublishedVersions, getRuntimeReadiness, getSidebarTree } from "@/scriptorium";
import { createConfiguredIcon, getInterfaceText, LanguageProvider, LanguageSuggestion } from "@scriptorium/ui";
import { resolveProjectAssetUrl } from "../_layout/project-assets";

/**
 * The docs chrome of one language: sidebar, version tabs and the language menu.
 * `language` is absent for the default language.
 */
export async function DocsLayoutView(
  {
    children,
    slug,
    language
  }: {
    children: ReactNode;
    slug?: string[];
    language?: string;
  }
) {
  const readiness = await getRuntimeReadiness();
  if (!hasUsableContent(readiness)) {
    return children;
  }

  const project = await getProjectConfig();
  const versions = await getPublishedVersions();
  const defaultLanguage = getDefaultLanguage(project);
  const activeLanguage = language ?? defaultLanguage;
  const docsBasePath = toDocsBasePath(project, activeLanguage);
  const currentRefSlug = slug?.[0] ?? toRefSlug(project.versions.home);
  const currentVersion = versions.find((version: PublishedVersion) => toRefSlug(version.name) === currentRefSlug) ?? versions[0];
  const currentRefName = currentVersion?.name ?? project.versions.home;
  const tree = await getSidebarTree(currentRefName, language) as any;
  const homeUrl = `${docsBasePath}/${toRefSlug(project.versions.home)}`;
  const logoUrl = resolveProjectAssetUrl(project.logo);
  const links = (project.links ?? []).map(toLayoutLink);
  const versionLanguages = currentVersion?.languages ?? [defaultLanguage];

  return (
    <LanguageProvider
      language={activeLanguage}
      defaultLanguage={defaultLanguage}
      languages={versionLanguages.map((code) => ({ locale: code, name: getLanguageLabel(project, code) }))}
      translations={getInterfaceText(activeLanguage).fumadocs}
    >
      {versionLanguages.length > 1
        ? <LanguageSuggestion language={activeLanguage} defaultLanguage={defaultLanguage} languages={versionLanguages} />
        : null}
      <DocsLayout
        tree={tree}
        links={links}
        themeSwitch={{ mode: "light-dark-system" }}
        tabs={versions
          .filter((version: PublishedVersion) => !language || version.languages.includes(language))
          .map((version: PublishedVersion) => ({
            title: resolveRefLabel(project, version.name),
            url: `${docsBasePath}/${toRefSlug(version.name)}`
          }))}
        nav={{
          title: (
            <span className="inline-flex items-center gap-2.5">
              <img alt="" aria-hidden="true" src={logoUrl} className="size-7 rounded-md object-contain" />
              <span className="font-medium">{project.name}</span>
            </span>
          ),
          url: homeUrl
        }}
      >
        {children}
      </DocsLayout>
    </LanguageProvider>
  );
}

function toLayoutLink(link: ProjectLink): LinkItemType {
  if (link.type === "icon") {
    return {
      ...copySharedLinkProps(link),
      type: "icon",
      label: link.label,
      text: link.text ?? link.label,
      secondary: link.secondary,
      icon: createConfiguredIcon(link.icon)
    };
  }

  if (link.type === "button") {
    return {
      ...copySharedLinkProps(link),
      type: "button",
      text: link.text,
      secondary: link.secondary,
      ...(link.icon ? { icon: createConfiguredIcon(link.icon) } : {})
    };
  }

  return {
    ...copySharedLinkProps(link),
    type: "main",
    text: link.text,
    description: link.description,
    ...(link.icon ? { icon: createConfiguredIcon(link.icon) } : {})
  };
}

function resolveRefLabel(project: ScriptoriumProjectConfig, refName: string) {
  return project.versions.meta[refName]?.label ?? refName;
}

function copySharedLinkProps(link: ProjectLink) {
  return {
    url: link.url,
    external: link.external,
    on: link.on,
    active: link.active
  };
}
