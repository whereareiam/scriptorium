import { getProjectConfig, getRuntimeReadiness, readCurrentAsset } from "@/scriptorium";
import {
  getAssetContentType,
  resolveProjectFaviconAssetPath,
  toCurrentAssetSegments
} from "../_layout/project-assets";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = await getRuntimeReadiness();
  if (!readiness.ok) {
    return new Response(null, { status: 503 });
  }

  const project = await getProjectConfig();
  const faviconPath = resolveProjectFaviconAssetPath(project);
  const assetSegments = toCurrentAssetSegments(faviconPath);
  const body = await readCurrentAsset(assetSegments);

  return new Response(body, {
    headers: {
      "content-type": getAssetContentType(faviconPath),
      "cache-control": "public, max-age=3600, s-maxage=3600"
    }
  });
}
