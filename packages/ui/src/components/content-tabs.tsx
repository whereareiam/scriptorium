'use client'

import type { ComponentProps } from 'react'
import { useState } from 'react'
import {
  Tabs as PrimitiveTabs,
  TabsContent as PrimitiveTabsContent,
  TabsList as PrimitiveTabsList,
  TabsTrigger as PrimitiveTabsTrigger,
} from 'fumadocs-ui/components/ui/tabs'

export interface ContentTabsProps extends Omit<
  ComponentProps<typeof PrimitiveTabs>,
  'defaultValue' | 'value' | 'onValueChange'
> {
  items: string[]
  defaultIndex?: number
  value?: string
  onValueChange?: (value: string) => void
}

export function ContentTabs({
  children,
  className,
  defaultIndex = 0,
  items,
  onValueChange,
  value,
  ...props
}: ContentTabsProps) {
  const [internalValue, setInternalValue] = useState(items[defaultIndex])
  const selectedValue = value ?? internalValue

  return (
    <PrimitiveTabs
      {...props}
      value={selectedValue}
      onValueChange={(nextValue) => {
        if (value === undefined) {
          setInternalValue(nextValue)
        }

        onValueChange?.(nextValue)
      }}
      className={[
        'my-6 flex flex-col overflow-hidden rounded-xl border border-fd-border bg-fd-card',
        typeof className === 'string' ? className : undefined,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <PrimitiveTabsList className="flex flex-row gap-1 overflow-x-auto px-3 shadow-[inset_0_-1px_0_var(--color-fd-border)]">
        {items.map((item) => (
          <PrimitiveTabsTrigger
            key={item}
            value={item}
            className={[
              'inline-flex items-center border-b-2 px-2 py-2.5 text-sm font-medium text-nowrap transition-colors',
              item === selectedValue
                ? 'border-fd-primary text-fd-foreground'
                : 'border-transparent text-fd-muted-foreground hover:text-fd-foreground',
            ].join(' ')}
            style={{ cursor: 'pointer' }}
          >
            {item}
          </PrimitiveTabsTrigger>
        ))}
      </PrimitiveTabsList>
      {children}
    </PrimitiveTabs>
  )
}

export interface ContentTabProps extends ComponentProps<typeof PrimitiveTabsContent> {}

export function ContentTab({ children, className, ...props }: ContentTabProps) {
  return (
    <PrimitiveTabsContent
      {...props}
      className={[
        'prose-no-margin p-4 outline-none data-[state=inactive]:hidden',
        typeof className === 'string' ? className : undefined,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </PrimitiveTabsContent>
  )
}
