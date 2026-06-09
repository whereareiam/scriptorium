import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { LinkItemType } from "fumadocs-ui/layouts/shared";
import type { ProjectLink, PublishedVersion, ScriptoriumProjectConfig } from "@scriptorium/server-api";
import { hasUsableContent, toRefSlug } from "@scriptorium/server-api";
import { getProjectConfig, getPublishedVersions, getRuntimeReadiness, getSidebarTree } from "@/scriptorium";
import { createConfiguredIcon } from "@scriptorium/ui";
import { resolveProjectAssetUrl } from "../_layout/project-assets";

export const dynamic = "force-dynamic";

export default async function DocsRootLayout(
  {
    children,
    params
  }: {
    children: ReactNode;
    params: Promise<{ slug?: string[] }>;
  }
) {
  const readiness = await getRuntimeReadiness();
  if (!hasUsableContent(readiness)) {
    return children;
  }

  const { slug = [] } = await params;
  const project = await getProjectConfig();
  const versions = await getPublishedVersions();
  const currentRefSlug = slug[0] ?? toRefSlug(project.versions.home);
  const currentVersion = versions.find((version: PublishedVersion) => toRefSlug(version.name) === currentRefSlug) ?? versions[0];
  const currentRefName = currentVersion?.name ?? project.versions.home;
  const tree = await getSidebarTree(currentRefName) as any;
  const homeUrl = `/docs/${toRefSlug(project.versions.home)}`;
  const logoUrl = resolveProjectAssetUrl(project.logo);
  const links = (project.links ?? []).map(toLayoutLink);

  return (
    <DocsLayout
      tree={tree}
      links={links}
      themeSwitch={{ mode: "light-dark-system" }}
      tabs={versions.map((version: PublishedVersion) => ({
        title: resolveRefLabel(project, version.name),
        url: `/docs/${toRefSlug(version.name)}`
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
      icon: createConfiguredIcon(link.icon)
    };
  }

  if (link.type === "button") {
    return {
      ...copySharedLinkProps(link),
      type: "button",
      text: link.text,
      secondary: link.secondary,
      ...(link.icon ? { icon: createConfiguredIcon(link.icon) } : {})
    };
  }

  return {
    ...copySharedLinkProps(link),
    type: "main",
    text: link.text,
    description: link.description,
    ...(link.icon ? { icon: createConfiguredIcon(link.icon) } : {})
  };
}

function resolveRefLabel(project: ScriptoriumProjectConfig, refName: string) {
  return project.versions.meta[refName]?.label ?? refName;
}

function copySharedLinkProps(link: ProjectLink) {
  return {
    url: link.url,
    external: link.external,
    on: link.on,
    active: link.active
  };
}
