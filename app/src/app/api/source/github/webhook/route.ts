import { handleSourceWebhook } from "@/scriptorium";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleSourceWebhook(request);
}
