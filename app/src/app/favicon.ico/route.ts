import { getProjectConfig, getRuntimeReadiness, readCurrentAsset } from "@/scriptorium";
import { hasUsableContent } from "@scriptorium/server-api";
import {
  getAssetContentType,
  resolveProjectFaviconAssetPath,
  toCurrentAssetSegments
} from "../_layout/project-assets";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = await getRuntimeReadiness();
  if (!hasUsableContent(readiness)) {
    return new Response(null, { status: 503 });
  }

  const project = await getProjectConfig();
  const faviconPath = resolveProjectFaviconAssetPath(project);
  const assetSegments = toCurrentAssetSegments(faviconPath);
  const body = await readCurrentAsset(assetSegments);

  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": getAssetContentType(faviconPath),
      "cache-control": "public, max-age=3600, s-maxage=3600"
    }
  });
}
