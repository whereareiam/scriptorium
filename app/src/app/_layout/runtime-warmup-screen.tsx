"use client";

import { useEffect, useState } from "react";

interface ReadinessResponse {
  ok: boolean;
  phase?: "idle" | "bundling" | "preparing-content" | "preparing-search" | "ready" | "error";
  error?: string;
}

export function RuntimeWarmupScreen() {
  const [status, setStatus] = useState<ReadinessResponse>({
    ok: false,
    phase: "bundling"
  });

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

  const hasError = status.phase === "error";
  const statusText = status.phase === "preparing-content"
    ? "Content is being prepared."
    : status.phase === "preparing-search"
      ? "Search is being prepared."
      : "The latest content is being bundled. This page will refresh automatically.";

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
              : statusText}
          </p>
        </div>
      </div>
    </main>
  );
}
