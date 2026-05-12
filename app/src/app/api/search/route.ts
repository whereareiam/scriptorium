import { createFromSource } from "fumadocs-core/search/server";
import { getSource } from "@/scriptorium";

export const dynamic = "force-dynamic";

const handler = createFromSource(async () => {
  const { source } = await getSource();

  return source;
});

export const GET = handler.GET;
