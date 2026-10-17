'use client'

import { Children, isValidElement, type ReactNode } from 'react'
import { useI18n } from 'fumadocs-ui/contexts/i18n'
import { getInterfaceText } from '../language/interface-text'

export type SettingFlag = 'advanced' | 'warning' | 'danger' | 'experimental' | 'reserved'

export interface SettingProps {
  /** The field's name, shown as its heading and anchor. */
  name: string
  /** What the field accepts. In a string, `backticked` parts are shown as code. */
  takes?: ReactNode
  /** The default value; a string without backticks is shown as code as a whole. */
  default?: ReactNode
  /** What the field changes, or what has to happen for a change to apply. */
  affects?: ReactNode
  flag?: SettingFlag
  /** The anchor; derived from the name when absent. */
  id?: string
  /** Heading level, 3 by default. */
  depth?: number
  /** Set during preparation, which adds the heading as the first child. */
  headed?: boolean
  children?: ReactNode
}

/** The colour of each flag: its label, and at 60% its rule down the setting's side. */
const FLAG_COLORS: Record<SettingFlag, string> = {
  advanced: '168 85 247',
  warning: '217 119 6',
  danger: '220 38 38',
  experimental: '59 130 246',
  reserved: '115 115 115',
}

/** One field of a configuration reference: its name, what it takes, its default and its effect. */
export function Setting({
  name,
  takes,
  default: defaultValue,
  affects,
  flag,
  id,
  depth = 3,
  headed = false,
  children,
}: SettingProps) {
  const { locale } = useI18n()
  const text = getInterfaceText(locale ?? 'en').scriptorium.setting
  const content = Children.toArray(children)
  const heading = headed && isValidElement(content[0]) ? content.shift() : null
  const Heading = `h${Math.min(Math.max(depth, 2), 6)}` as 'h3'
  const rows = [
    { label: text.takes, value: takes, code: false },
    { label: text.default, value: defaultValue, code: true },
    { label: text.affects, value: affects, code: false },
  ].filter((row) => row.value !== undefined && row.value !== null && row.value !== '')

  const flagColor = flag ? FLAG_COLORS[flag] : undefined

  return (
    <div
      data-setting={name}
      style={flagColor ? { borderInlineStartColor: `rgb(${flagColor} / 0.6)` } : undefined}
      // A rule down the side marks a flagged setting; the divider below starts where the
      // text does, so the two never meet.
      className="relative my-6 border-s-2 border-transparent ps-3.5 pb-3 after:absolute after:start-3.5 after:end-0 after:bottom-0 after:border-b after:border-fd-border after:content-['']"
    >
      <div className="[&>:is(h2,h3,h4,h5,h6)]:my-0 [&>:is(h2,h3,h4,h5,h6)]:min-w-0 [&>:is(h2,h3,h4,h5,h6)]:font-mono [&>:is(h2,h3,h4,h5,h6)]:text-[1.0625rem] [&>:is(h2,h3,h4,h5,h6)]:font-semibold [&>:is(h2,h3,h4,h5,h6)]:break-all [&>:is(h2,h3,h4,h5,h6)]:text-fd-primary [&>:is(h2,h3,h4,h5,h6)_code]:border-0 [&>:is(h2,h3,h4,h5,h6)_code]:bg-transparent [&>:is(h2,h3,h4,h5,h6)_code]:p-0 [&>:is(h2,h3,h4,h5,h6)_code]:text-[1em] [&>:is(h2,h3,h4,h5,h6)_code]:text-inherit">
        {heading ?? (
          <Heading
            id={id ?? toAnchor(name)}
            className="scroll-m-28"
          >
            <code>{name}</code>
          </Heading>
        )}
      </div>
      {flag ? (
        <p
          style={{ color: `rgb(${flagColor})` }}
          className="not-prose text-xs font-semibold tracking-wide uppercase"
        >
          {text.flags[flag]}
        </p>
      ) : null}
      {rows.map((row) => (
        <p
          key={row.label}
          className="not-prose mt-1 text-sm break-words"
        >
          <span className="me-1.5 text-fd-muted-foreground">{row.label}</span>
          {typeof row.value === 'string' ? renderText(row.value, row.code) : row.value}
        </p>
      ))}
      {content.length > 0 ? (
        <div className="mt-2 [&>:first-child]:mt-0 [&>:last-child]:mb-0">{content}</div>
      ) : null}
    </div>
  )
}

/**
 * Text of a string prop, with `backticked` parts as code. A default without backticks is a
 * value, so it is code as a whole.
 */
function renderText(value: string, codeByDefault: boolean) {
  const parts = value.split('`')
  if (parts.length < 3) {
    return codeByDefault ? <InlineCode>{value}</InlineCode> : value
  }

  return parts.map((part, index) =>
    index % 2 === 1 ? <InlineCode key={index}>{part}</InlineCode> : part,
  )
}

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="font-mono text-[0.8125rem] text-fd-primary">{children}</code>
}

function toAnchor(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\-_ ]/g, '')
    .replace(/ /g, '-')
}
