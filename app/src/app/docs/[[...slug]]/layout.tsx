import type { ReactNode } from 'react'
import { DocsLayoutView } from '../../_docs/docs-layout-view'

export default async function DocsLayoutRoute({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ slug?: string[] }>
}) {
  const { slug } = await params
  return <DocsLayoutView slug={slug}>{children}</DocsLayoutView>
}
