import { redirect } from "next/navigation";
import { hasUsableContent, toRefSlug } from "@scriptorium/server-api";
import { getProjectConfig, getRuntimeReadiness } from "@/scriptorium";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const readiness = await getRuntimeReadiness();
  if (!hasUsableContent(readiness)) {
    return null;
  }

  const config = await getProjectConfig();
  redirect(`/docs/${toRefSlug(config.versions.home)}`);
}
