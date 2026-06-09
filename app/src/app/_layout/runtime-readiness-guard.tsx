"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RuntimeWarmupScreen } from "./warmup/runtime-warmup-screen";

export function RuntimeReadinessGuard(
  {
    contentToken,
    captions,
    children
  }: {
    contentToken?: string;
    captions: string[];
    children: ReactNode;
  }
) {
  const [blocked, setBlocked] = useState(false);
  const [currentContentToken, setCurrentContentToken] = useState(contentToken);

  useEffect(() => {
    let disposed = false;

    async function checkReadiness() {
      try {
        const response = await fetch("/api/health/ready", {
          cache: "no-store"
        });
        const nextStatus = await response.json() as {
          state?: {
            kind?: "ready" | "refreshing" | "starting" | "failed";
            content?: {
              token?: string;
            };
          };
        };

        if (disposed) {
          return;
        }

        if (nextStatus.state?.kind === "starting" || nextStatus.state?.kind === "failed") {
          setBlocked(true);
          return;
        }

        setBlocked(false);

        const nextToken = nextStatus.state?.content?.token;
        if (nextToken && nextToken !== currentContentToken) {
          setCurrentContentToken(nextToken);
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
  }, [currentContentToken]);

  if (blocked) {
    return <RuntimeWarmupScreen captions={captions} />;
  }

  return <>{children}</>;
}
