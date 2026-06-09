export interface ServedPageTreeRoot {
  type?: "root";
  name: string;
  description?: string;
  children: ServedPageTreeNode[];
}

export type ServedPageTreeNode =
  | ServedPageTreePage
  | ServedPageTreeFolder
  | ServedPageTreeSeparator;

export interface ServedPageTreePage {
  type: "page";
  name: string;
  url: string;
  external?: boolean;
  description?: string;
}

export interface ServedPageTreeSeparator {
  type: "separator";
  name?: string;
}

export interface ServedPageTreeFolder {
  type: "folder";
  name: string;
  description?: string;
  root?: boolean;
  defaultOpen?: boolean;
  collapsible?: boolean;
  index?: ServedPageTreePage;
  children: ServedPageTreeNode[];
}
