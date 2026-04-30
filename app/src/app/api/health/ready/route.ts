import { ensureRuntimeReady } from "@/scriptorium";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureRuntimeReady();
  return Response.json({ ok: true, warmed: true });
}
