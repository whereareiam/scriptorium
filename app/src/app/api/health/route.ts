import { handleHealthRequest } from "@/scriptorium";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleHealthRequest();
}
