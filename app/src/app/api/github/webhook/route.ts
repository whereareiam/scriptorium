import { handleWebhookTrigger } from "@/scriptorium";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleWebhookTrigger(request);
}
