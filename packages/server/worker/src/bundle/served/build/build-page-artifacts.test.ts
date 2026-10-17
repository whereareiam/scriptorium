import { describe, expect, test } from 'bun:test'
import { buildPageArtifacts, toArtifactPath } from './build-page-artifacts'

describe('buildPageArtifacts', () => {
  test('builds route-based artifact paths', () => {
    expect(toArtifactPath([])).toBe('index.json')
    expect(toArtifactPath(['faq'])).toBe('faq/index.json')
    expect(toArtifactPath(['configuration', 'settings'])).toBe('configuration/settings/index.json')
  })

  test('serializes artifacts and trims the ref folder from the sidebar tree', async () => {
    const result = await buildPageArtifacts(
      {
        getPages() {
          return [
            {
              path: 'dev/index.mdx',
              url: '/docs/dev',
              slugs: ['dev'],
              data: {
                title: 'Home',
                description: 'Welcome',
                async load() {
                  return {
                    serialize() {
                      return {
                        type: 'js' as const,
                        code: 'return { default: () => null, toc: [] };',
                        filePath: 'dev/index.mdx',
                        baseUrl: 'file:///dev/index.mdx',
                        structuredData: [],
                      }
                    },
                  }
                },
              },
            },
          ]
        },
        getPageTree() {
          return {
            type: 'root',
            name: 'root',
            children: [
              {
                type: 'folder',
                $ref: { folder: 'dev', meta: 'dev/meta.json' },
                name: 'Development',
                root: true,
                children: [
                  {
                    type: 'page',
                    name: 'Home',
                    url: '/docs/dev',
                  },
                  {
                    type: 'folder',
                    $id: 'dev/server',
                    name: 'Server admins',
                    root: true,
                    icon: 'Server',
                    children: [
                      {
                        type: 'page',
                        name: 'Install',
                        url: '/docs/dev/server/install',
                        icon: 'Download',
                      },
                    ],
                  },
                ],
              },
            ],
          }
        },
      } as any,
      'dev',
    )

    expect(result.artifacts).toHaveLength(1)
    expect(result.artifacts[0]?.entry.artifactPath).toBe('index.json')
    expect(result.artifacts[0]?.artifact.routeSegments).toEqual(['dev'])
    expect(result.tree.name).toBe('Development')
    expect(result.tree.children).toHaveLength(2)
    expect(result.tree.children[1]).toMatchObject({
      type: 'folder',
      $id: 'dev/server',
      name: 'Server admins',
      root: true,
      icon: 'Server',
      children: [{ type: 'page', name: 'Install', icon: 'Download' }],
    })
  })
})
