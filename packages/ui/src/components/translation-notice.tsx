import { Callout } from 'fumadocs-ui/components/callout'
import type { ServedPageTranslationState } from '@scriptorium/server-api'
import type { ScriptoriumText } from '../language/interface-text'

export interface TranslationNoticeProps {
  state: ServedPageTranslationState
  originalUrl: string
  text: ScriptoriumText
}

/** Tells readers of a translated language that they see the original or an outdated translation. */
export function TranslationNotice({ state, originalUrl, text }: TranslationNoticeProps) {
  if (state === 'translated') {
    return null
  }

  const outdated = state === 'outdated'
  return (
    <Callout
      type={outdated ? 'warn' : 'info'}
      title={outdated ? text.translationOutdatedTitle : text.translationMissingTitle}
    >
      <p>
        {outdated ? text.translationOutdated : text.translationMissing}{' '}
        {outdated ? <a href={originalUrl}>{text.openOriginal}</a> : null}
      </p>
    </Callout>
  )
}
