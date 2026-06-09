import path from "node:path";
import type { ScriptoriumProjectConfig } from "@scriptorium/server-api";

function normalizeProjectAssetPath(assetPath: string) {
  return assetPath.replaceAll("\\", "/").replace(/^\/+/, "");
}

export function resolveProjectAssetUrl(assetPath: string) {
  const normalized = normalizeProjectAssetPath(assetPath);

  if (normalized.startsWith("docs/assets/")) {
    return `/assets/${normalized.slice("docs/assets/".length)}`;
  }

  if (normalized.startsWith("assets/")) {
    return `/${normalized}`;
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function resolveProjectFaviconAssetPath(project: ScriptoriumProjectConfig) {
  return project.favicon ?? project.logo;
}

export function resolveProjectFaviconUrl(project: ScriptoriumProjectConfig) {
  return resolveProjectAssetUrl(resolveProjectFaviconAssetPath(project));
}

export function toCurrentAssetSegments(assetPath: string) {
  const normalized = normalizeProjectAssetPath(assetPath);

  if (normalized.startsWith("docs/assets/")) {
    return normalized.slice("docs/assets/".length).split("/").filter(Boolean);
  }

  if (normalized.startsWith("assets/")) {
    return normalized.slice("assets/".length).split("/").filter(Boolean);
  }

  return normalized.split("/").filter(Boolean);
}

export function getAssetContentType(assetPath: string) {
  const extension = path.extname(assetPath).toLowerCase();

  switch (extension) {
    case ".gif":
      return "image/gif";
    case ".ico":
      return "image/x-icon";
    case ".jpeg":
    case ".jpg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}
