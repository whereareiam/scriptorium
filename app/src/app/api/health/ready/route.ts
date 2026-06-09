import { handleReadinessRequest } from "@/scriptorium";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleReadinessRequest();
}
