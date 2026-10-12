import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import {
  getDefaultLanguage,
  hasUsableContent,
  toDocsBasePath,
  toRefSlug,
  type PublishedVersion,
  type ScriptoriumProjectConfig,
} from '@scriptorium/server-api'
import {
  getPreparedPage,
  getProjectConfig,
  getPublishedVersions,
  getRuntimeReadiness,
  renderPreparedPageArtifact,
  resolvePreparedPageHref,
} from '@/scriptorium'
import { getInterfaceText, getMDXComponents, TranslationNotice } from '@scriptorium/ui'
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page'
import type { ComponentProps, FC } from 'react'

/** A docs page in one language; `language` is absent for the default language. */
export async function DocsPageView({
  slug = [],
  language,
}: {
  slug?: string[]
  language?: string
}) {
  const readiness = await getRuntimeReadiness()
  if (!hasUsableContent(readiness)) {
    return null
  }

  const project = await getProjectConfig()
  if (slug.length === 0) {
    redirect(`${toDocsBasePath(project, language)}/${toRefSlug(project.versions.home)}`)
  }

  await redirectWhenUntranslated(project, slug, language)
  const page = await getPreparedPage(slug, language)
  if (!page) {
    notFound()
  }

  const components = getMDXComponents()
  const { body, toc } = await renderPreparedPageArtifact(page, {
    ...components,
    a: createPreparedRelativeLink(
      slug[0],
      page.sourcePath,
      components.a as FC<ComponentProps<'a'>>,
      language,
    ),
  })

  return (
    <DocsPage
      toc={toc as any}
      tableOfContent={{
        style: 'clerk',
      }}
    >
      <DocsTitle>{page.title}</DocsTitle>
      <DocsDescription>{page.description}</DocsDescription>
      {page.translation ? (
        <TranslationNotice
          state={page.translation.state}
          originalUrl={`${toDocsBasePath(project)}/${slug.join('/')}`}
          text={getInterfaceText(page.translation.language).scriptorium}
        />
      ) : null}
      <DocsBody>{body}</DocsBody>
    </DocsPage>
  )
}

export async function buildDocsPageMetadata({
  slug = [],
  language,
}: {
  slug?: string[]
  language?: string
}): Promise<Metadata> {
  const readiness = await getRuntimeReadiness()
  if (!hasUsableContent(readiness)) {
    return {
      title: 'Preparing documentation',
    }
  }

  const project = await getProjectConfig()
  if (slug.length === 0) {
    return {
      title: project.name,
      description: project.description,
    }
  }

  await redirectWhenUntranslated(project, slug, language)
  const page = await getPreparedPage(slug, language)
  if (!page) {
    notFound()
  }

  const version = await findVersion(slug[0])
  return {
    title: page.title,
    description: page.description,
    alternates:
      version && version.languages.length > 1
        ? {
            languages: Object.fromEntries(
              version.languages.map((code) => [
                code,
                `${toDocsBasePath(project, code)}/${slug.join('/')}`,
              ]),
            ),
          }
        : undefined,
  }
}

/** A version that has no translation in this language is read in the default language. */
async function redirectWhenUntranslated(
  project: ScriptoriumProjectConfig,
  slug: string[],
  language?: string,
) {
  if (!language || language === getDefaultLanguage(project)) {
    return
  }

  const version = await findVersion(slug[0])
  if (version && !version.languages.includes(language)) {
    redirect(`${toDocsBasePath(project)}/${slug.join('/')}`)
  }
}

async function findVersion(refSlug: string) {
  const versions = await getPublishedVersions()
  return versions.find(
    (version: PublishedVersion) => toRefSlug(version.name) === refSlug || version.name === refSlug,
  )
}

function createPreparedRelativeLink(
  refSlug: string,
  sourcePath: string,
  OverrideLink: FC<ComponentProps<'a'>>,
  language?: string,
): FC<ComponentProps<'a'>> {
  return async function PreparedRelativeLink({ href, ...props }) {
    return (
      <OverrideLink
        href={href ? await resolvePreparedPageHref(refSlug, sourcePath, href, language) : href}
        {...props}
      />
    )
  }
}
