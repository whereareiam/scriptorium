export const EDGE_CACHE_SECONDS = 30;

const variantHeaders = [
  "rsc", "next-router-state-tree", "next-router-prefetch",
  "next-router-segment-prefetch", "next-url", "next-action", "x-middleware-prefetch"
];

/** Only anonymous, non-personalized document responses may enter a shared cache. */
export function isEdgeCacheCandidate(request: Request): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  if (request.headers.has("authorization") || request.headers.get("cookie")) return false;
  if (variantHeaders.some(header => request.headers.has(header))) return false;
  const url = new URL(request.url);
  if (url.pathname === "/api/search")
    return [...url.searchParams.keys()].every(key => key === "ref") && url.searchParams.getAll("ref").length <= 1;
  if (url.search !== "") return false;
  return url.pathname === "/" || url.pathname === "/docs" || url.pathname.startsWith("/docs/") || url.pathname.startsWith("/assets/");
}

export function edgeCacheControl(request: Request, hasContent: boolean): string {
  return hasContent && isEdgeCacheCandidate(request)
    ? `public, max-age=${EDGE_CACHE_SECONDS}`
    : "no-store";
}
