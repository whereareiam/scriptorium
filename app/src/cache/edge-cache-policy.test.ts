import { expect, test } from "bun:test";
import { edgeCacheControl, isEdgeCacheCandidate } from "./edge-cache-policy";

const request = (path = "/docs/dev", headers: Record<string, string> = {}) => new Request(`https://docs.example${path}`, { headers });

test("anonymous HTML, assets, and versioned search use a short edge TTL only after content exists", () => {
  for (const path of ["/", "/docs", "/docs/dev", "/assets/logo.svg", "/api/search", "/api/search?ref=dev"]) {
    expect(edgeCacheControl(request(path), true)).toBe("public, max-age=30");
    expect(edgeCacheControl(request(path), false)).toBe("no-store");
  }
});

test("RSC variants, credentials, and personalized requests cannot reuse cached HTML", () => {
  for (const name of ["rsc", "next-router-state-tree", "next-router-prefetch", "next-router-segment-prefetch", "next-url", "next-action", "x-middleware-prefetch", "authorization", "cookie"])
    expect(edgeCacheControl(request("/docs/dev", { [name]: "1" }), true)).toBe("no-store");
});

test("webhooks, health, arbitrary queries, and writes bypass shared caches", () => {
  for (const path of ["/api/source/github/webhook", "/api/health", "/api/health/ready", "/docs/dev?_rsc=abc", "/docs/dev?tracking=x", "/api/search?ref=dev&ref=other", "/api/search?unknown=x"])
    expect(isEdgeCacheCandidate(request(path))).toBe(false);
  expect(isEdgeCacheCandidate(new Request("https://docs.example/docs/dev", { method: "POST" }))).toBe(false);
});
