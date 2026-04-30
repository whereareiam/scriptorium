"use client";

import type { ComponentProps } from "react";
import { useState } from "react";
import {
  Tabs as PrimitiveTabs,
  TabsContent as PrimitiveTabsContent,
  TabsList as PrimitiveTabsList,
  TabsTrigger as PrimitiveTabsTrigger
} from "fumadocs-ui/components/ui/tabs";

export interface ContentTabsProps extends Omit<ComponentProps<typeof PrimitiveTabs>, "defaultValue" | "value" | "onValueChange"> {
  items: string[];
  defaultIndex?: number;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function ContentTabs(
  {
    children,
    className,
    defaultIndex = 0,
    items,
    onValueChange,
    value,
    ...props
  }: ContentTabsProps
) {
  const [internalValue, setInternalValue] = useState(items[defaultIndex]);
  const selectedValue = value ?? internalValue;

  return (
    <PrimitiveTabs
      {...props}
      value={selectedValue}
      onValueChange={(nextValue) => {
        if (value === undefined) {
          setInternalValue(nextValue);
        }

        onValueChange?.(nextValue);
      }}
      className={[
        "my-6 flex flex-col gap-6",
        typeof className === "string" ? className : undefined
      ].filter(Boolean).join(" ")}
    >
      <PrimitiveTabsList className="inline-flex w-fit max-w-full flex-row items-center gap-1 overflow-x-auto rounded-xl border border-fd-border bg-fd-muted p-1">
        {items.map((item) => (
          <PrimitiveTabsTrigger
            key={item}
            value={item}
            className={[
              "inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium text-nowrap transition-colors",
              item === selectedValue
                ? "border-transparent bg-fd-primary/10 text-fd-primary"
                : "border-transparent text-fd-muted-foreground hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80"
            ].join(" ")}
            style={{ cursor: "pointer" }}
          >
            {item}
          </PrimitiveTabsTrigger>
        ))}
      </PrimitiveTabsList>
      {children}
    </PrimitiveTabs>
  );
}

export interface ContentTabProps extends ComponentProps<typeof PrimitiveTabsContent> {}

export function ContentTab({ children, className, ...props }: ContentTabProps) {
  return (
    <PrimitiveTabsContent
      {...props}
      className={[
        "prose-no-margin rounded-xl border border-fd-border bg-transparent p-4 outline-none data-[state=inactive]:hidden",
        typeof className === "string" ? className : undefined
      ].filter(Boolean).join(" ")}
    >
      {children}
    </PrimitiveTabsContent>
  );
}
