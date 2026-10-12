import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import { RootProvider } from 'fumadocs-ui/provider/next'
import {
  getDefaultLanguage,
  hasUsableContent,
  type ScriptoriumProjectConfig,
} from '@scriptorium/server-api'
import { getInterfaceText } from '@scriptorium/ui'
import {
  buildWorkspaceThemeStylesheet,
  getBundlingCaptions,
  getProjectConfig,
  getRuntimeReadiness,
} from '@/scriptorium'
import { RuntimeReadinessGuard } from './_layout/runtime-readiness-guard'
import { SearchDialog } from './_layout/search-dialog'
import { resolveProjectAssetUrl, resolveProjectFaviconUrl } from './_layout/project-assets'
import { RuntimeWarmupScreen } from './_layout/warmup/runtime-warmup-screen'
import { WorkspaceBody } from './_layout/workspace-body'
import { LANGUAGE_HEADER } from '@/language/language-header'
import './global.css'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const readiness = await getRuntimeReadiness()
  if (!hasUsableContent(readiness)) {
    return {
      title: 'Preparing documentation',
    }
  }

  const project = await getProjectConfig()
  const faviconUrl = resolveProjectFaviconUrl(project)
  const logoUrl = resolveProjectAssetUrl(project.logo)

  return {
    icons: {
      icon: [{ url: '/favicon.ico' }, { url: faviconUrl }, { url: logoUrl }],
      shortcut: ['/favicon.ico'],
      apple: [{ url: logoUrl }],
    },
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const readiness = await getRuntimeReadiness()
  if (!hasUsableContent(readiness)) {
    const captions = await getBundlingCaptions()
    return (
      <html
        lang="en"
        suppressHydrationWarning
      >
        <body
          className="min-h-screen bg-fd-background text-fd-foreground"
          suppressHydrationWarning
        >
          <RootProvider>
            <RuntimeWarmupScreen captions={captions} />
          </RootProvider>
        </body>
      </html>
    )
  }

  const project = await getProjectConfig()
  const captions = await getBundlingCaptions()
  const workspaceThemeCss = buildWorkspaceThemeStylesheet(project)
  const contentToken = readiness.state.content?.token
  const language = resolveRequestLanguage(project, (await headers()).get(LANGUAGE_HEADER))

  return (
    <html
      lang={language}
      suppressHydrationWarning
    >
      <WorkspaceBody>
        {workspaceThemeCss ? <style>{workspaceThemeCss}</style> : null}
        <RootProvider
          search={{ SearchDialog }}
          i18n={{ locale: language, translations: getInterfaceText(language).fumadocs }}
        >
          <RuntimeReadinessGuard
            contentToken={contentToken}
            captions={captions}
          >
            {children}
          </RuntimeReadinessGuard>
        </RootProvider>
      </WorkspaceBody>
    </html>
  )
}

/** The language of the requested page: a published translation's prefix, or the default language. */
function resolveRequestLanguage(project: ScriptoriumProjectConfig, pathLanguage: string | null) {
  if (pathLanguage && project.i18n?.languages[pathLanguage]) {
    return pathLanguage
  }

  return getDefaultLanguage(project)
}
