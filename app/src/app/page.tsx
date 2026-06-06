import { redirect } from "next/navigation";
import { getProjectConfig, getRefUrl, getRuntimeReadiness, getSource } from "@/scriptorium";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const readiness = await getRuntimeReadiness();
  if (!readiness.ok) {
    return null;
  }

  const config = await getProjectConfig();
  const { source } = await getSource();
  redirect(getRefUrl(source, config.versions.home));
}
