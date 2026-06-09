import type { FC } from "react";
import type { MDXComponents } from "mdx/types";
import * as Accordions from "fumadocs-ui/components/accordion";
import * as Steps from "fumadocs-ui/components/steps";
import * as Tabs from "fumadocs-ui/components/tabs";
import * as Icons from "lucide-react";
import defaultMdxComponents from "fumadocs-ui/mdx";
import * as ContentTabs from "./components/content-tabs";
import * as Badge from "./components/badge";
import * as MavenVersionLink from "./components/maven-version-link";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ...(Icons as unknown as Record<keyof typeof Icons, FC>),
    ...Accordions,
    ...Steps,
    ...ContentTabs,
    ...Tabs,
    ...Badge,
    ...MavenVersionLink,
    ...components
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
