import type * as PageTree from 'fumadocs-core/page-tree'
import type {
  ServedPageTreeFolder,
  ServedPageTreeNode,
  ServedPageTreePage,
  ServedPageTreeRoot,
} from '@scriptorium/server-api'
import { createSidebarIcon } from '@scriptorium/ui'

/** The served sidebar of a version as the docs layout takes it, with its icons drawn. */
export function toSidebarTree(root: ServedPageTreeRoot): PageTree.Root {
  return {
    ...root,
    children: root.children.map(toNode),
  } as PageTree.Root
}

function toNode(node: ServedPageTreeNode): PageTree.Node {
  if (node.type === 'folder') {
    return toFolder(node)
  }

  if (node.type === 'page') {
    return toPage(node)
  }

  return { ...node, icon: toIcon(node.icon) }
}

function toFolder(node: ServedPageTreeFolder): PageTree.Folder {
  return {
    ...node,
    icon: toIcon(node.icon),
    index: node.index ? toPage(node.index) : undefined,
    children: node.children.map(toNode),
  }
}

function toPage(node: ServedPageTreePage): PageTree.Item {
  return { ...node, icon: toIcon(node.icon) }
}

function toIcon(name?: string) {
  return name ? createSidebarIcon(name) : undefined
}
