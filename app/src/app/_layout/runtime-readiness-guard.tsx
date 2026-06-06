"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RuntimeWarmupScreen } from "./runtime-warmup-screen";

export function RuntimeReadinessGuard(
  {
    captions,
    children
  }: {
    captions: string[];
    children: ReactNode;
  }
) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (blocked) {
      return;
    }

    let disposed = false;

    async function checkReadiness() {
      try {
        const response = await fetch("/api/health/ready", {
          cache: "no-store"
        });
        const nextStatus = await response.json() as { ok?: boolean };

        if (disposed || nextStatus.ok !== false) {
          return;
        }

        setBlocked(true);
      } catch {
        // Keep the current page visible on transient polling failures.
      }
    }

    const interval = window.setInterval(() => {
      void checkReadiness();
    }, 1500);

    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [blocked]);

  if (blocked) {
    return <RuntimeWarmupScreen captions={captions} />;
  }

  return <>{children}</>;
}
