"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import type { RefSwitcherProps } from "../models/ref-switcher";

function replaceRefInPathname(pathname: string, nextRef: string) {
  const segments = pathname.split("/");

  if (segments.length < 3 || segments[1] !== "docs") {
    return `/docs/${nextRef}`;
  }

  segments[2] = nextRef;
  return segments.join("/") || `/docs/${nextRef}`;
}

export function RefSwitcher({ activeRef, refs }: RefSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();

  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    router.push(replaceRefInPathname(pathname, event.target.value));
  }

  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-fd-muted-foreground">Version</span>
      <select
        className="rounded-lg border border-fd-border bg-fd-card px-3 py-2 text-sm outline-none"
        value={activeRef}
        onChange={onChange}
      >
        {refs.map((ref) => (
          <option key={ref.name} value={ref.name}>
            {ref.label ?? ref.name} ({ref.kind})
          </option>
        ))}
      </select>
    </label>
  );
}
