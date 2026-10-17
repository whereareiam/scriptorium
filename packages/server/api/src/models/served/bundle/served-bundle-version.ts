import type { PublishedVersionKind } from '../../published/published-version-kind'
import type { ServedBundleTranslation } from './served-bundle-translation'

export interface ServedBundleVersion {
  name: string
  slug: string
  kind: PublishedVersionKind
  pageIndexPath: string
  pageTreePath: string
  pageArtifactsDir: string
  searchIndexPath: string
  /** The prepared `docs/components` of the version, shared by all of its languages. */
  componentsPath?: string
  translations?: ServedBundleTranslation[]
}
