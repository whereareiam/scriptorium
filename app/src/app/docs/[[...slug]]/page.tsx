import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { LocalMarkdownPage } from "@fumadocs/local-md";
import { hasUsableContent, toRefSlug } from "@scriptorium/server-api";
import { getProjectConfig, getRuntimeReadiness, getSource } from "@/scriptorium";
import { getMDXComponents } from "@scriptorium/ui";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";

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

  const { source } = await getSource(slug[0]);
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  const localPage = page.data as LocalMarkdownPage<Record<string, unknown>, Record<string, unknown>>;
  const { render } = await localPage.load();
  const { body, toc } = await render(
    getMDXComponents({
      a: createRelativeLink(source as never, page as never)
    })
  );

  return (
    <DocsPage
      toc={toc}
      tableOfContent={{
        style: "clerk"
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
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

  const { source } = await getSource(slug[0]);
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  return {
    title: page.data.title,
    description: page.data.description
  };
}
