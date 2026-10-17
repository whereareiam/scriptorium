import type {
  ServedPageTreeFolder,
  ServedPageTreeNode,
  ServedPageTreeRoot,
} from './models/served/page/served-page-tree'

/**
 * Where a version opens when its content has no index page of its own: the first page of its
 * first section (a root folder), or its first page when it has no sections.
 */
export function findStartPageUrl(tree: ServedPageTreeRoot): string | undefined {
  const section = findFirstSection(tree.children)
  return section ? findFirstPageUrl([section]) : findFirstPageUrl(tree.children)
}

function findFirstSection(nodes: ServedPageTreeNode[]): ServedPageTreeFolder | undefined {
  for (const node of nodes) {
    if (node.type !== 'folder') continue
    if (node.root) return node
    const nested = findFirstSection(node.children)
    if (nested) return nested
  }

  return undefined
}

function findFirstPageUrl(nodes: ServedPageTreeNode[]): string | undefined {
  for (const node of nodes) {
    if (node.type === 'page' && !node.external) return node.url
    if (node.type === 'folder') {
      const url = node.index?.url ?? findFirstPageUrl(node.children)
      if (url) return url
    }
  }

  return undefined
}
