/** The prepared pages, sidebar and search of one translated language of a version. */
export interface ServedBundleTranslation {
  language: string
  pageIndexPath: string
  pageTreePath: string
  pageArtifactsDir: string
  searchIndexPath: string
}
