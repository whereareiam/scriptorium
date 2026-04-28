import { redirect } from "next/navigation";
import { getProjectConfig, toRefSlug } from "@scriptorium/site-runtime";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const config = await getProjectConfig();
  redirect(`/docs/${toRefSlug(config.defaultRef)}`);
}
