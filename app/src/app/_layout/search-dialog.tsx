'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import {
  SearchDialog as PrimitiveSearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search'
import { useDocsSearch } from 'fumadocs-core/search/client'
import { staticClient } from 'fumadocs-core/search/client/orama-static'
import { parseDocsPathname } from '@scriptorium/ui'

export function SearchDialog(props: SharedProps) {
  const pathname = usePathname()
  const docsPath = pathname ? parseDocsPathname(pathname) : undefined
  const from = toSearchIndexUrl(docsPath?.refSlug, docsPath?.language)
  // The exported index carries its own tokenizer, so every language searches the way it was indexed.
  const client = useMemo(() => staticClient({ from }), [from])
  const search = useDocsSearch({ client })

  return (
    <PrimitiveSearchDialog
      {...search}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList />
      </SearchDialogContent>
    </PrimitiveSearchDialog>
  )
}

function toSearchIndexUrl(refSlug?: string, language?: string) {
  const params = new URLSearchParams()
  if (refSlug) params.set('ref', refSlug)
  if (language) params.set('lang', language)
  const query = params.toString()
  return `/api/search${query ? `?${query}` : ''}`
}
