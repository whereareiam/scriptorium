import { getRuntimeReadiness, readCurrentAsset } from "@/scriptorium";
import { hasUsableContent } from "@scriptorium/server-api";
import { getAssetContentType } from "../../_layout/project-assets";

export async function GET(_: Request, context: { params: Promise<{ asset: string[] }> }) {
  const readiness = await getRuntimeReadiness();
  if (!hasUsableContent(readiness)) {
    return new Response(null, { status: 503 });
  }

  const { asset } = await context.params;
  const body = await readCurrentAsset(asset);
  const fileName = asset.at(-1) ?? "";

  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": getAssetContentType(fileName)
    }
  });
}
