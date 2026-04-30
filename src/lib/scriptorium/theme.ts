import type { ScriptoriumProjectConfig } from "./config";
import { getRefMetadata } from "./config";
import { toRefSlug } from "./source";

export function getWorkspaceClassName(refSlug: string) {
  return `workspace-${refSlug}`;
}

export function buildWorkspaceThemeStylesheet(config: ScriptoriumProjectConfig) {
  const rules: string[] = [];

  for (const refName of Object.keys(config.refs)) {
    const theme = getRefMetadata(config, refName).theme;
    if (!theme) continue;

    const declarations = [
      theme.primary && `--color-fd-primary:${theme.primary};`,
      theme.primaryForeground && `--color-fd-primary-foreground:${theme.primaryForeground};`,
      theme.ring && `--color-fd-ring:${theme.ring};`,
      theme.accent && `--color-fd-accent:${theme.accent};`,
      theme.accentForeground && `--color-fd-accent-foreground:${theme.accentForeground};`,
      theme.border && `--color-fd-border:${theme.border};`
    ].filter(Boolean);

    if (declarations.length === 0) continue;

    rules.push(`.${getWorkspaceClassName(toRefSlug(refName))}{${declarations.join("")}}`);
  }

  return rules.join("\n");
}

