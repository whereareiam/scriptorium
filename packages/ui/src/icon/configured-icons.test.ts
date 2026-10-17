import { describe, expect, test } from 'bun:test'
import { BookOpen, ExternalLink, Settings } from 'lucide-react'
import { createConfiguredIcon, createSidebarIcon } from './configured-icons'

describe('configured icons', () => {
  test('resolves Lucide icons by exact, lowercase or kebab-case name', () => {
    expect(createSidebarIcon('BookOpen')?.type).toBe(BookOpen)
    expect(createSidebarIcon('book-open')?.type).toBe(BookOpen)
    expect(createSidebarIcon('settings')?.type).toBe(Settings)
  })

  test('leaves sidebar entries without an icon for unknown names', () => {
    expect(createSidebarIcon('no-such-icon')).toBeUndefined()
  })

  test('falls back to the external link icon for links', () => {
    expect(createConfiguredIcon('no-such-icon').type).toBe(ExternalLink)
    expect(createConfiguredIcon('Settings').type).toBe(Settings)
  })
})
