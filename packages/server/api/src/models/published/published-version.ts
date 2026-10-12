import type { PublishedVersionKind } from './published-version-kind'

export interface PublishedVersion {
  name: string
  kind: PublishedVersionKind
  /** Languages this version is published in, the default language first. */
  languages: string[]
}
