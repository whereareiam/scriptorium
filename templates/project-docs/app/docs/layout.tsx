import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { getProjectConfig, getPublishedRefs, getRefMetadata, getRefUrl, getSource } from "@scriptorium/site-runtime";

export const dynamic = "force-dynamic";

export default async function DocsRootLayout({ children }: { children: ReactNode }) {
  const project = await getProjectConfig();
  const refs = await getPublishedRefs();
  const { source } = await getSource();
  const githubLink = project.links.find((link) => isGitHubLink(link.url));
  const links = project.links
    .filter((link) => link !== githubLink)
    .map((link) => ({
    text: link.label,
    url: link.url,
    external: link.url.startsWith("http")
    }));

  return (
    <DocsLayout
      tree={source.getPageTree()}
      githubUrl={githubLink?.url}
      links={links}
      tabs={refs.map((ref) => ({
        title: getRefMetadata(project, ref.name).label,
        url: getRefUrl(source, ref.name)
      }))}
      nav={{
        title: <span className="font-medium">{project.name}</span>
      }}
    >
      {children}
    </DocsLayout>
  );
}

function isGitHubLink(url: string) {
  return url.includes("github.com");
}
