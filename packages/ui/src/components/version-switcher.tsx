'use client'

import { useState } from 'react'
import Link from 'fumadocs-core/link'
import { Popover, PopoverContent, PopoverTrigger } from 'fumadocs-ui/components/ui/popover'
import { useSidebar } from 'fumadocs-ui/components/sidebar/base'
import { Check, ChevronsUpDown, GitBranch, Tag } from 'lucide-react'

export interface VersionOption {
  title: string
  kind: 'branch' | 'tag'
  /** The same page in that version where it has one, otherwise its start page. */
  url: string
  active: boolean
}

export interface VersionSwitcherProps {
  versions: VersionOption[]
  /** The accessible name of the trigger. */
  label: string
}

/** A compact menu of the published versions, above the sidebar's section tabs. */
export function VersionSwitcher({ versions, label }: VersionSwitcherProps) {
  const [open, setOpen] = useState(false)
  const { closeOnRedirect } = useSidebar()
  const active = versions.find((version) => version.active) ?? versions[0]
  if (!active) {
    return null
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger
        aria-label={label}
        className="flex items-center gap-2 rounded-lg border bg-fd-secondary/50 px-2 py-1.5 text-start text-sm text-fd-secondary-foreground transition-colors hover:bg-fd-accent data-[state=open]:bg-fd-accent data-[state=open]:text-fd-accent-foreground"
      >
        <VersionIcon kind={active.kind} />
        <span className="truncate font-medium">{active.title}</span>
        <ChevronsUpDown className="ms-auto size-3.5 shrink-0 text-fd-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="fd-scroll-container flex w-(--radix-popover-trigger-width) flex-col gap-0.5 p-1">
        {versions.map((version) => (
          <Link
            key={version.url}
            href={version.url}
            onClick={() => {
              closeOnRedirect.current = false
              setOpen(false)
            }}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-fd-accent hover:text-fd-accent-foreground"
          >
            <VersionIcon kind={version.kind} />
            <span className="truncate">{version.title}</span>
            <Check
              className={[
                'ms-auto size-3.5 shrink-0 text-fd-primary',
                version.active ? '' : 'invisible',
              ].join(' ')}
            />
          </Link>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function VersionIcon({ kind }: { kind: VersionOption['kind'] }) {
  const Icon = kind === 'tag' ? Tag : GitBranch
  return <Icon className="size-3.5 shrink-0 text-fd-muted-foreground" />
}
