import type { PublishedVersionKind } from "../../published/published-version-kind";

export interface ServedBundleVersion {
  name: string;
  slug: string;
  kind: PublishedVersionKind;
  pageIndexPath: string;
  pageTreePath: string;
  pageArtifactsDir: string;
  searchIndexPath: string;
}
