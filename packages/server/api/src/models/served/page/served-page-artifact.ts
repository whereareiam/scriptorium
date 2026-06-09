export interface ServedPageTocNode {
  type: string;
  value?: string;
  depth?: number;
  url?: string;
  children?: ServedPageTocNode[];
}

export interface ServedPageTocItem {
  url: string;
  title: ServedPageTocNode;
  depth: number;
}

export interface ServedPageAstRenderer {
  kind: "ast";
  tree: unknown;
  filePath: string;
  rehypeToc?: ServedPageTocItem[];
  structuredData?: unknown;
}

export interface ServedPageJsRenderer {
  kind: "js";
  code: string;
  filePath: string;
  baseUrl?: string;
  structuredData?: unknown;
}

export type ServedPageRenderer = ServedPageAstRenderer | ServedPageJsRenderer;

export interface ServedPageArtifact {
  routeSegments: string[];
  sourcePath: string;
  url: string;
  title: string;
  description?: string;
  renderer: ServedPageRenderer;
}
