"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RuntimeWarmupScreen } from "./runtime-warmup-screen";

export function RuntimeReadinessGuard(
  {
    activeGenerationId,
    captions,
    children
  }: {
    activeGenerationId?: string;
    captions: string[];
    children: ReactNode;
  }
) {
  const [blocked, setBlocked] = useState(false);
  const [currentGenerationId, setCurrentGenerationId] = useState(activeGenerationId);

  useEffect(() => {
    let disposed = false;

    async function checkReadiness() {
      try {
        const response = await fetch("/api/health/ready", {
          cache: "no-store"
        });
        const nextStatus = await response.json() as {
          ok?: boolean;
          activeGenerationId?: string;
        };

        if (disposed) {
          return;
        }

        if (nextStatus.ok === false) {
          setBlocked(true);
          return;
        }

        if (nextStatus.activeGenerationId && nextStatus.activeGenerationId !== currentGenerationId) {
          setCurrentGenerationId(nextStatus.activeGenerationId);
          window.location.reload();
        }
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
  }, [blocked, currentGenerationId]);

  if (blocked) {
    return <RuntimeWarmupScreen captions={captions} />;
  }

  return <>{children}</>;
}
