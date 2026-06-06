import { getPreparedSearchIndex, getRuntimeReadiness } from "@/scriptorium";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = await getRuntimeReadiness();
  if (!readiness.ok) {
    return Response.json(
      {
        error: "Search is not ready.",
        phase: readiness.status.phase
      },
      {
        status: 503
      }
    );
  }

  const body = await getPreparedSearchIndex();
  return new Response(body, {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
}
