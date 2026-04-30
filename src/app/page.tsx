import { redirect } from "next/navigation";
import { getProjectConfig, getRefUrl, getSource } from "@/lib/scriptorium";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const config = await getProjectConfig();
  const { source } = await getSource();
  redirect(getRefUrl(source, config.defaultRef));
}
