import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { hasUsableContent, toRefSlug } from "@scriptorium/server-api";
import {
  getPreparedPage,
  getProjectConfig,
  getRuntimeReadiness,
  renderPreparedPageArtifact,
  resolvePreparedPageHref
} from "@/scriptorium";
import { getMDXComponents } from "@scriptorium/ui";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import type { ComponentProps, FC } from "react";

export const dynamic = "force-dynamic";

export default async function DocsPageRoute(
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const readiness = await getRuntimeReadiness();
  if (!hasUsableContent(readiness)) {
    return null;
  }

  const { slug = [] } = await params;
  if (slug.length === 0) {
    const config = await getProjectConfig();
    redirect(`/docs/${toRefSlug(config.versions.home)}`);
  }

  const page = await getPreparedPage(slug);
  if (!page) {
    notFound();
  }

  const components = getMDXComponents();
  const { body, toc } = await renderPreparedPageArtifact(page, {
    ...components,
    a: createPreparedRelativeLink(slug[0], page.sourcePath, components.a as FC<ComponentProps<"a">>)
  });

  return (
    <DocsPage
      toc={toc as any}
      tableOfContent={{
        style: "clerk"
      }}
    >
      <DocsTitle>{page.title}</DocsTitle>
      <DocsDescription>{page.description}</DocsDescription>
      <DocsBody>{body}</DocsBody>
    </DocsPage>
  );
}
export async function generateMetadata(
  { params }: { params: Promise<{ slug?: string[] }> }
): Promise<Metadata> {
  const readiness = await getRuntimeReadiness();
  if (!hasUsableContent(readiness)) {
    return {
      title: "Preparing documentation"
    };
  }

  const { slug = [] } = await params;
  if (slug.length === 0) {
    const config = await getProjectConfig();

    return {
      title: config.name,
      description: config.description
    };
  }

  const page = await getPreparedPage(slug);
  if (!page) {
    notFound();
  }

  return {
    title: page.title,
    description: page.description
  };
}

function createPreparedRelativeLink(
  refSlug: string,
  sourcePath: string,
  OverrideLink: FC<ComponentProps<"a">>
): FC<ComponentProps<"a">> {
  return async function PreparedRelativeLink({ href, ...props }) {
    return (
      <OverrideLink
        href={href ? await resolvePreparedPageHref(refSlug, sourcePath, href) : href}
        {...props}
      />
    );
  };
}
