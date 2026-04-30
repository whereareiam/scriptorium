import { readCurrentAsset } from "@/scriptorium";
import { getAssetContentType } from "../../_layout/project-assets";

export async function GET(_: Request, context: { params: Promise<{ asset: string[] }> }) {
  const { asset } = await context.params;
  const body = await readCurrentAsset(asset);
  const fileName = asset.at(-1) ?? "";

  return new Response(body, {
    headers: {
      "content-type": getAssetContentType(fileName)
    }
  });
}
