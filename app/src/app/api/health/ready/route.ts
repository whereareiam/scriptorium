import { getRuntimeReadiness } from "@/scriptorium";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = await getRuntimeReadiness();
  const status = readiness.ok ? 200 : 503;

  return Response.json(
    {
      ok: readiness.ok,
      phase: readiness.status.phase,
      lastSuccessfulPreparedAt: readiness.status.lastSuccessfulPreparedAt,
      activeGenerationId: readiness.status.activeGenerationId,
      error: readiness.status.error
    },
    {
      status
    }
  );
}
