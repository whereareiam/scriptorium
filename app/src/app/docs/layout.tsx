import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { BundledVersion } from "@scriptorium/bundle";
import { getProjectConfig, getPublishedVersions, getRefMetadata, getRefUrl, getSource } from "@/scriptorium";

export const dynamic = "force-dynamic";

export default async function DocsRootLayout({ children }: { children: ReactNode }) {
  const project = await getProjectConfig();
  const versions = await getPublishedVersions();
  const { source } = await getSource();

  return (
    <DocsLayout
      tree={source.getPageTree()}
      githubUrl={project.urls?.github}
      tabs={versions.map((version: BundledVersion) => ({
        title: getRefMetadata(project, version.name).label,
        url: getRefUrl(source, version.name)
      }))}
      nav={{
        title: <span className="font-medium">{project.name}</span>
      }}
    >
      {children}
    </DocsLayout>
  );
}
