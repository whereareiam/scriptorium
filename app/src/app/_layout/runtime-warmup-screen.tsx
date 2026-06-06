"use client";

import { useEffect, useState } from "react";
import {
  nextBundlingCaptionIndex,
  resolveBundlingCaption
} from "./runtime-warmup-copy";

interface ReadinessResponse {
  ok: boolean;
  phase?: "idle" | "bundling" | "preparing-content" | "preparing-search" | "ready" | "error";
  error?: string;
}

export function RuntimeWarmupScreen({ captions }: { captions?: string[] }) {
  const [status, setStatus] = useState<ReadinessResponse>({
    ok: false,
    phase: "bundling"
  });
  const [captionIndex, setCaptionIndex] = useState(0);

  useEffect(() => {
    let disposed = false;

    async function checkReadiness() {
      try {
        const response = await fetch("/api/health/ready", {
          cache: "no-store"
        });
        const nextStatus = await response.json() as ReadinessResponse;

        if (disposed) return;

        if (nextStatus.ok) {
          window.location.reload();
          return;
        }

        setStatus(nextStatus);
      } catch {
        if (!disposed) {
          setStatus({
            ok: false,
            phase: "bundling"
          });
        }
      }
    }

    void checkReadiness();
    const interval = window.setInterval(checkReadiness, 1500);

    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setCaptionIndex(0);
  }, [captions]);

  useEffect(() => {
    if (!captions || captions.length <= 1 || status.phase === "error") {
      return;
    }

    const interval = window.setInterval(() => {
      setCaptionIndex((currentIndex) => nextBundlingCaptionIndex(currentIndex, captions));
    }, 3500);

    return () => {
      window.clearInterval(interval);
    };
  }, [captions, status.phase]);

  const hasError = status.phase === "error";
  const caption = captions && captions.length > 0
    ? resolveBundlingCaption(captions, captionIndex)
    : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-fd-background px-6 text-fd-foreground">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div
          aria-hidden="true"
          className="size-9 animate-spin rounded-full border-2 border-fd-muted border-t-fd-primary"
        />
        <div className="space-y-1.5">
          <h1 className="text-base font-medium">
            {hasError ? "Documentation refresh failed" : "Preparing documentation"}
          </h1>
          <p className="text-sm leading-6 text-fd-muted-foreground">
            {hasError
              ? status.error ?? "The latest bundle could not be built."
              : caption ?? "The latest content is being bundled. This page will refresh automatically."}
          </p>
        </div>
      </div>
    </main>
  );
}
