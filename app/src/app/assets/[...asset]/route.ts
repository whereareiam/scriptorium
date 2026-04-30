import path from "node:path";
import { readCurrentAsset } from "@/scriptorium";

const contentTypes: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

export async function GET(_: Request, context: { params: Promise<{ asset: string[] }> }) {
  const { asset } = await context.params;
  const body = await readCurrentAsset(asset);
  const extension = path.extname(asset.at(-1) ?? "");

  return new Response(body, {
    headers: {
      "content-type": contentTypes[extension] ?? "application/octet-stream"
    }
  });
}
