import { describe, expect, test } from 'bun:test'
import type * as PageTree from 'fumadocs-core/page-tree'
import { getSectionTabs } from './sidebar-navigation'

describe('getSectionTabs', () => {
  test('offers every root folder, opening its index or its first page', () => {
    const tree: PageTree.Root = {
      name: 'Docs',
      children: [
        { type: 'page', name: 'Overview', url: '/docs/dev' },
        {
          type: 'folder',
          $id: 'server',
          name: 'Server admins',
          description: 'Install and run',
          root: true,
          index: { type: 'page', name: 'Server admins', url: '/docs/dev/server' },
          children: [],
        },
        {
          type: 'folder',
          $id: 'contributing',
          name: 'Contributing',
          root: true,
          children: [
            {
              type: 'folder',
              name: 'Building',
              index: { type: 'page', name: 'Building', url: '/docs/dev/contributing/building' },
              children: [],
            },
          ],
        },
        { type: 'folder', name: 'Empty', root: true, children: [] },
      ],
    }

    expect(
      getSectionTabs(tree).map((tab) => [tab.title, tab.url, tab.description, tab.$folder?.$id]),
    ).toEqual([
      ['Server admins', '/docs/dev/server', 'Install and run', 'server'],
      ['Contributing', '/docs/dev/contributing/building', undefined, 'contributing'],
    ])
  })
})
