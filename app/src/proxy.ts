import { readFile } from "node:fs/promises";
import { NextResponse, type NextRequest } from "next/server";
import { loadRuntimeConfig, resolveRuntimePaths } from "./config/load-runtime-config";
import { edgeCacheControl, isEdgeCacheCandidate } from "./cache/edge-cache-policy";

let stateFile: string | undefined;

export async function proxy(request: NextRequest) {
  let hasContent = false;
  if (isEdgeCacheCandidate(request)) {
    stateFile ??= resolveRuntimePaths(loadRuntimeConfig()).stateFile;
    try {
      const state = JSON.parse(await readFile(stateFile, "utf8"));
      hasContent = Boolean(state.activeGenerationId && state.lastSuccessfulPreparedAt);
    } catch {
      // Initial warmup and missing state must never be shared-cacheable.
    }
  }
  const response = NextResponse.next();
  response.headers.set("CDN-Cache-Control", edgeCacheControl(request, hasContent));
  return response;
}

export const config = {
  matcher: ["/", "/docs/:path*", "/assets/:path*", "/api/search", "/api/health/:path*"]
};
