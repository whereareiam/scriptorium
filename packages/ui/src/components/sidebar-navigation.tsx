'use client'

import { useMemo, type ReactNode } from 'react'
import type * as PageTree from 'fumadocs-core/page-tree'
import { SidebarTabsDropdown } from 'fumadocs-ui/components/sidebar/tabs/dropdown'
import { useTreeContext, useTreePath } from 'fumadocs-ui/contexts/tree'
import type { LayoutTab } from 'fumadocs-ui/layouts/shared'
import { VersionSwitcher, type VersionOption } from './version-switcher'

export interface SidebarNavigationProps {
  versions: VersionOption[]
  versionLabel: string
  /** Shown in the section menu on pages that belong to no section. */
  sectionPlaceholder: string
}

/**
 * The top of the docs sidebar: the version menu, then a menu of the sections that the
 * version's root folders (`"root": true` in a folder's meta.json) make, such as one per
 * audience.
 */
export function SidebarNavigation({
  versions,
  versionLabel,
  sectionPlaceholder,
}: SidebarNavigationProps) {
  const { full: tree } = useTreeContext()
  const path = useTreePath()
  const inSection = path.some((node) => node.type === 'folder' && node.root)
  const tabs = useMemo(() => {
    const all = getSectionTabs(tree)
    if (inSection) {
      return all
    }

    // Fumadocs only offers sections on pages inside one; elsewhere, such as on the start
    // page, offer the top-level sections as plain links.
    return all
      .filter((tab) => tab.$folder && tree.children.includes(tab.$folder))
      .map(({ $folder: _folder, ...tab }) => tab)
  }, [tree, inSection])

  return (
    <>
      {versions.length > 1 ? (
        <VersionSwitcher
          versions={versions}
          label={versionLabel}
        />
      ) : null}
      {tabs.length > 0 ? (
        <SidebarTabsDropdown
          options={tabs}
          placeholder={
            <span className="text-sm font-medium text-fd-muted-foreground">
              {sectionPlaceholder}
            </span>
          }
        />
      ) : null}
    </>
  )
}

/**
 * The root folders of the tree as menu entries, like Fumadocs' `getLayoutTabs`, except that a
 * section whose pages all sit in subfolders opens its first page rather than being left out.
 */
export function getSectionTabs(tree: PageTree.Root): LayoutTab[] {
  const tabs: LayoutTab[] = []
  const visit = (node: PageTree.Root | PageTree.Folder, unlisted?: boolean) => {
    if ('root' in node && node.root) {
      const url = node.index?.url ?? findFirstPage(node)?.url
      if (url) {
        tabs.push({
          title: node.name,
          icon: node.icon ? <SectionIcon>{node.icon}</SectionIcon> : undefined,
          description: node.description,
          url,
          unlisted,
          $folder: node,
        })
      }
    }

    for (const child of node.children) {
      if (child.type === 'folder') visit(child, unlisted)
    }
  }

  visit(tree)
  if (tree.fallback) visit(tree.fallback, true)
  return tabs
}

/**
 * Fumadocs gives a section's icon a 36 px box on narrow screens and a 20 px one on wide ones;
 * the icon itself stays 16 px in both, on a tile where the box is large.
 */
function SectionIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-full items-center justify-center rounded-md border bg-fd-secondary text-fd-muted-foreground md:border-0 md:bg-transparent md:text-current [&_svg]:size-4">
      {children}
    </span>
  )
}

function findFirstPage(folder: PageTree.Folder): PageTree.Item | undefined {
  for (const child of folder.children) {
    if (child.type === 'page' && !child.external) return child
    if (child.type === 'folder') {
      const page = child.index ?? findFirstPage(child)
      if (page) return page
    }
  }

  return undefined
}
