import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { BundledVersion } from "@scriptorium/bundle";
import { getProjectConfig, getPublishedVersions, getRefMetadata, getRefUrl, getRuntimeReadiness, getSource } from "@/scriptorium";
import { resolveProjectAssetUrl } from "../_layout/project-assets";

export const dynamic = "force-dynamic";

export default async function DocsRootLayout({ children }: { children: ReactNode }) {
  const readiness = await getRuntimeReadiness();
  if (!readiness.ok) {
    return children;
  }

  const project = await getProjectConfig();
  const versions = await getPublishedVersions();
  const { source } = await getSource();
  const homeUrl = getRefUrl(source, project.versions.home);
  const logoUrl = resolveProjectAssetUrl(project.logo);

  return (
    <DocsLayout
      tree={source.getPageTree()}
      githubUrl={project.urls?.github}
      tabs={versions.map((version: BundledVersion) => ({
        title: getRefMetadata(project, version.name).label,
        url: getRefUrl(source, version.name)
      }))}
      nav={{
        title: (
          <span className="inline-flex items-center gap-2.5">
            <img alt="" aria-hidden="true" src={logoUrl} className="size-7 rounded-md object-contain" />
            <span className="font-medium">{project.name}</span>
          </span>
        ),
        url: homeUrl
      }}
    >
      {children}
    </DocsLayout>
  );
}
