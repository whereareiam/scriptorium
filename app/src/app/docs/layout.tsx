import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { LinkItemType } from "fumadocs-ui/layouts/shared";
import type { BundledVersion } from "@scriptorium/bundle";
import type { ProjectLink } from "@scriptorium/core";
import { getProjectConfig, getPublishedVersions, getRefMetadata, getRefUrl, getRuntimeReadiness, getSource } from "@/scriptorium";
import { createProjectLinkIcon } from "@scriptorium/ui";
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
  const links = (project.links ?? []).map(toLayoutLink);

  return (
    <DocsLayout
      tree={source.getPageTree()}
      links={links}
      themeSwitch={{ mode: "light-dark-system" }}
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

function toLayoutLink(link: ProjectLink): LinkItemType {
  if (link.type === "icon") {
    return {
      ...copySharedLinkProps(link),
      type: "icon",
      label: link.label,
      text: link.text ?? link.label,
      secondary: link.secondary,
      icon: createProjectLinkIcon(link.icon)
    };
  }

  if (link.type === "button") {
    return {
      ...copySharedLinkProps(link),
      type: "button",
      text: link.text,
      secondary: link.secondary,
      ...(link.icon ? { icon: createProjectLinkIcon(link.icon) } : {})
    };
  }

  return {
    ...copySharedLinkProps(link),
    type: "main",
    text: link.text,
    description: link.description,
    ...(link.icon ? { icon: createProjectLinkIcon(link.icon) } : {})
  };
}

function copySharedLinkProps(link: ProjectLink) {
  return {
    url: link.url,
    external: link.external,
    on: link.on,
    active: link.active
  };
}
