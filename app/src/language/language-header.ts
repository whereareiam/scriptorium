/** Carries the language prefix of a request from the proxy to the root layout. */
export const LANGUAGE_HEADER = 'x-scriptorium-language'

/** The language prefix of `/<language>/docs/...`, absent for default-language paths. */
export function readPathLanguage(pathname: string) {
  return /^\/([a-z]{2,3}(?:-[A-Za-z0-9]+)?)\/docs(?:\/|$)/.exec(pathname)?.[1]
}
