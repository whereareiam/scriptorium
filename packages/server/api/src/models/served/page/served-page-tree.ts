export interface ServedPageTreeRoot {
  type?: 'root'
  name: string
  description?: string
  children: ServedPageTreeNode[]
}

export type ServedPageTreeNode = ServedPageTreePage | ServedPageTreeFolder | ServedPageTreeSeparator

export interface ServedPageTreePage {
  type: 'page'
  /** The node's id in the Fumadocs page tree. */
  $id?: string
  name: string
  url: string
  external?: boolean
  description?: string
  /** A Lucide icon name, from the page's frontmatter. */
  icon?: string
}

export interface ServedPageTreeSeparator {
  type: 'separator'
  $id?: string
  name?: string
  icon?: string
}

export interface ServedPageTreeFolder {
  type: 'folder'
  $id?: string
  name: string
  description?: string
  /** A Lucide icon name, from the folder's meta.json. */
  icon?: string
  /** A root folder is a section of its own, offered in the sidebar's section menu. */
  root?: boolean | string
  defaultOpen?: boolean
  collapsible?: boolean
  index?: ServedPageTreePage
  children: ServedPageTreeNode[]
}
