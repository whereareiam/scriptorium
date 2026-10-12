import type { Metadata } from 'next'
import { buildDocsPageMetadata, DocsPageView } from '../../_docs/docs-page-view'

export const dynamic = 'force-dynamic'

export default async function DocsPageRoute({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params
  return <DocsPageView slug={slug} />
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}): Promise<Metadata> {
  const { slug } = await params
  return buildDocsPageMetadata({ slug })
}
