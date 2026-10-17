import type { FC } from 'react'
import type { MDXComponents } from 'mdx/types'
import * as Accordions from 'fumadocs-ui/components/accordion'
import * as Files from 'fumadocs-ui/components/files'
import * as Steps from 'fumadocs-ui/components/steps'
import * as Tabs from 'fumadocs-ui/components/tabs'
import * as Icons from 'lucide-react'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import * as ContentTabs from './components/content-tabs'
import * as Badge from './components/badge'
import * as MavenVersionLink from './components/maven-version-link'
import * as Setting from './components/setting'

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ...(Icons as unknown as Record<keyof typeof Icons, FC>),
    ...Accordions,
    // File trees; `File` and `Folder` take the place of the Lucide icons of the same name,
    // which stay available as `FileIcon` and `FolderIcon`.
    ...Files,
    ...Steps,
    ...ContentTabs,
    ...Tabs,
    ...Badge,
    ...MavenVersionLink,
    ...Setting,
    ...components,
  } satisfies MDXComponents
}

export const useMDXComponents = getMDXComponents

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>
}
