import { handleSearchRequest } from "@/scriptorium";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleSearchRequest(request);
}
