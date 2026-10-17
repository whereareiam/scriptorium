import * as React from 'react'
import * as JsxRuntime from 'react/jsx-runtime'
import * as Icons from 'lucide-react'
import * as Accordion from 'fumadocs-ui/components/accordion'
import * as Banner from 'fumadocs-ui/components/banner'
import * as Callout from 'fumadocs-ui/components/callout'
import * as Card from 'fumadocs-ui/components/card'
import * as CodeBlock from 'fumadocs-ui/components/codeblock'
import * as Files from 'fumadocs-ui/components/files'
import * as Heading from 'fumadocs-ui/components/heading'
import * as ImageZoom from 'fumadocs-ui/components/image-zoom'
import * as InlineToc from 'fumadocs-ui/components/inline-toc'
import * as Steps from 'fumadocs-ui/components/steps'
import * as Tabs from 'fumadocs-ui/components/tabs'
import * as TypeTable from 'fumadocs-ui/components/type-table'
import type { ProjectComponentModule } from '@scriptorium/server-api'
import { Badge } from './components/badge'
import { ContentTab, ContentTabs } from './components/content-tabs'
import { MavenVersionLink } from './components/maven-version-link'
import { Setting } from './components/setting'

/** Scriptorium's own MDX components, as project components import them from `@scriptorium/ui`. */
const SCRIPTORIUM_COMPONENTS = {
  Badge,
  ContentTab,
  ContentTabs,
  MavenVersionLink,
  Setting,
}

/** The host modules project components import, keyed by specifier. */
export const projectComponentModules = {
  react: React,
  'react/jsx-runtime': JsxRuntime,
  'lucide-react': Icons,
  'fumadocs-ui/components/accordion': Accordion,
  'fumadocs-ui/components/banner': Banner,
  'fumadocs-ui/components/callout': Callout,
  'fumadocs-ui/components/card': Card,
  'fumadocs-ui/components/codeblock': CodeBlock,
  'fumadocs-ui/components/files': Files,
  'fumadocs-ui/components/heading': Heading,
  'fumadocs-ui/components/image-zoom': ImageZoom,
  'fumadocs-ui/components/inline-toc': InlineToc,
  'fumadocs-ui/components/steps': Steps,
  'fumadocs-ui/components/tabs': Tabs,
  'fumadocs-ui/components/type-table': TypeTable,
  '@scriptorium/ui': SCRIPTORIUM_COMPONENTS,
} satisfies Record<ProjectComponentModule, unknown>
