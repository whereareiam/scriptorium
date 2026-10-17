import type { ReactNode } from 'react'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import type { LinkItemType } from 'fumadocs-ui/layouts/shared'
import type {
  ProjectLink,
  PublishedVersion,
  ScriptoriumProjectConfig,
} from '@scriptorium/server-api'
import {
  getDefaultLanguage,
  getLanguageLabel,
  hasUsableContent,
  toDocsBasePath,
  toRefSlug,
} from '@scriptorium/server-api'
import {
  getProjectConfig,
  getPublishedVersions,
  getRuntimeReadiness,
  getSidebarTree,
  hasPreparedPage,
} from '@/scriptorium'
import {
  createConfiguredIcon,
  getInterfaceText,
  LanguageProvider,
  LanguageSuggestion,
  SidebarNavigation,
} from '@scriptorium/ui'
import { resolveProjectAssetUrl } from '../_layout/project-assets'
import { toSidebarTree } from './sidebar-tree'

/**
 * The docs chrome of one language: sidebar, version and section menus and the language menu.
 * `language` is absent for the default language.
 */
export async function DocsLayoutView({
  children,
  slug,
  language,
}: {
  children: ReactNode
  slug?: string[]
  language?: string
}) {
  const readiness = await getRuntimeReadiness()
  if (!hasUsableContent(readiness)) {
    return children
  }

  const project = await getProjectConfig()
  const versions = await getPublishedVersions()
  const defaultLanguage = getDefaultLanguage(project)
  const activeLanguage = language ?? defaultLanguage
  const docsBasePath = toDocsBasePath(project, activeLanguage)
  const currentRefSlug = slug?.[0] ?? toRefSlug(project.versions.home)
  const currentVersion =
    versions.find((version: PublishedVersion) => toRefSlug(version.name) === currentRefSlug) ??
    versions[0]
  const currentRefName = currentVersion?.name ?? project.versions.home
  const tree = toSidebarTree(await getSidebarTree(currentRefName, language))
  const homeUrl = `${docsBasePath}/${toRefSlug(project.versions.home)}`
  const logoUrl = resolveProjectAssetUrl(project.logo)
  const links = (project.links ?? []).map(toLayoutLink)
  const versionLanguages = currentVersion?.languages ?? [defaultLanguage]
  const pageSegments = slug?.slice(1) ?? []
  const versionOptions = await Promise.all(
    versions
      .filter((version: PublishedVersion) => !language || version.languages.includes(language))
      .map(async (version: PublishedVersion) => {
        const versionUrl = `${docsBasePath}/${toRefSlug(version.name)}`
        // Switching versions keeps the reader on the same page when that version has it.
        const samePage =
          pageSegments.length > 0 && (await hasPreparedPage(version.name, pageSegments, language))
        return {
          title: resolveRefLabel(project, version.name),
          kind: version.kind,
          url: samePage ? `${versionUrl}/${pageSegments.join('/')}` : versionUrl,
          active: version.name === currentRefName,
        }
      }),
  )

  return (
    <LanguageProvider
      language={activeLanguage}
      defaultLanguage={defaultLanguage}
      languages={versionLanguages.map((code) => ({
        locale: code,
        name: getLanguageLabel(project, code),
      }))}
      translations={getInterfaceText(activeLanguage).fumadocs}
    >
      {versionLanguages.length > 1 ? (
        <LanguageSuggestion
          language={activeLanguage}
          defaultLanguage={defaultLanguage}
          languages={versionLanguages}
        />
      ) : null}
      <DocsLayout
        tree={tree}
        links={links}
        themeSwitch={{ mode: 'light-dark-system' }}
        // Root folders become the section menu, below the version menu, so both are drawn
        // in the sidebar banner instead of the layout's own tabs.
        tabs={false}
        sidebar={{
          banner: (
            <SidebarNavigation
              key="navigation"
              versions={versionOptions}
              versionLabel={getInterfaceText(activeLanguage).scriptorium.chooseVersion}
              sectionPlaceholder={getInterfaceText(activeLanguage).scriptorium.chooseSection}
            />
          ),
        }}
        nav={{
          title: (
            <span className="inline-flex items-center gap-2.5">
              <img
                alt=""
                aria-hidden="true"
                src={logoUrl}
                className="size-7 rounded-md object-contain"
              />
              <span className="font-medium">{project.name}</span>
            </span>
          ),
          url: homeUrl,
        }}
      >
        {children}
      </DocsLayout>
    </LanguageProvider>
  )
}

function toLayoutLink(link: ProjectLink): LinkItemType {
  if (link.type === 'icon') {
    return {
      ...copySharedLinkProps(link),
      type: 'icon',
      label: link.label,
      text: link.text ?? link.label,
      secondary: link.secondary,
      icon: createConfiguredIcon(link.icon),
    }
  }

  if (link.type === 'button') {
    return {
      ...copySharedLinkProps(link),
      type: 'button',
      text: link.text,
      secondary: link.secondary,
      ...(link.icon ? { icon: createConfiguredIcon(link.icon) } : {}),
    }
  }

  return {
    ...copySharedLinkProps(link),
    type: 'main',
    text: link.text,
    description: link.description,
    ...(link.icon ? { icon: createConfiguredIcon(link.icon) } : {}),
  }
}

function resolveRefLabel(project: ScriptoriumProjectConfig, refName: string) {
  return project.versions.meta[refName]?.label ?? refName
}

function copySharedLinkProps(link: ProjectLink) {
  return {
    url: link.url,
    external: link.external,
    on: link.on,
    active: link.active,
  }
}
