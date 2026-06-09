import type { PublishedVersionKind } from "../published/published-version-kind";

export interface ServedBundleVersion {
  name: string;
  slug: string;
  kind: PublishedVersionKind;
  contentDir: string;
  searchIndexPath: string;
}
