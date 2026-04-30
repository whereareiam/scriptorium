import type {FC} from "react";
import type {MDXComponents} from "mdx/types";
import * as Accordions from "fumadocs-ui/components/accordion";
import * as Tabs from "fumadocs-ui/components/tabs";
import * as Icons from "lucide-react";
import defaultMdxComponents from "fumadocs-ui/mdx";
import * as ContentTabs from "./content-tabs";
import * as Badge from "./badge";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ...(Icons as unknown as Record<keyof typeof Icons, FC>),
    ...Accordions,
    ...ContentTabs,
    ...Tabs,
    ...Badge,
    ...components
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
