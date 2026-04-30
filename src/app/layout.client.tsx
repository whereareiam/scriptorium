"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";

export function WorkspaceBody({ children }: { children: ReactNode }) {
  const { slug = [] } = useParams<{ slug?: string[] }>();
  const workspaceClass = Array.isArray(slug) && slug.length > 0
    ? getWorkspaceClassName(slug[0])
    : undefined;

  return (
    <body
      className={[
        "min-h-screen",
        "bg-fd-background",
        "text-fd-foreground",
        workspaceClass
      ].filter(Boolean).join(" ")}
      suppressHydrationWarning
    >
      {children}
    </body>
  );
}

function getWorkspaceClassName(refSlug: string) {
  return `workspace-${refSlug}`;
}
