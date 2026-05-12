import { getRuntimeReadiness, startRuntimeWarmup } from "@/scriptorium";

export const dynamic = "force-dynamic";

export async function GET() {
  startRuntimeWarmup();

  const readiness = await getRuntimeReadiness();
  const status = readiness.ready ? 200 : 503;

  return Response.json(
    {
      ok: readiness.ready,
      warmed: readiness.status.phase === "ready",
      cachedBundle: readiness.cachedBundle,
      phase: readiness.status.phase,
      runtimeEnabled: readiness.runtimeEnabled,
      error: readiness.status.error
    },
    {
      status
    }
  );
}
