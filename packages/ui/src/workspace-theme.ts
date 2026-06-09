type RefTheme = {
  primary?: string;
  primaryForeground?: string;
  ring?: string;
  accent?: string;
  accentForeground?: string;
  border?: string;
};

type WorkspaceThemeConfig = {
  versions: {
    meta: Record<string, {
      label?: string;
      theme?: RefTheme;
    }>;
  };
};

export function buildWorkspaceThemeStylesheet(config: WorkspaceThemeConfig) {
  const rules: string[] = [];

  for (const refName of Object.keys(config.versions.meta)) {
    const theme = config.versions.meta[refName]?.theme;
    if (!theme)
      continue;

    const declarations = [
      theme.primary && `--color-fd-primary:${theme.primary};`,
      theme.primaryForeground && `--color-fd-primary-foreground:${theme.primaryForeground};`,
      theme.ring && `--color-fd-ring:${theme.ring};`,
      theme.accent && `--color-fd-accent:${theme.accent};`,
      theme.accentForeground && `--color-fd-accent-foreground:${theme.accentForeground};`,
      theme.border && `--color-fd-border:${theme.border};`
    ].filter(Boolean);

    if (declarations.length === 0)
      continue;

    rules.push(`.${getWorkspaceClassName(toRefSlug(refName))}{${declarations.join("")}}`);
  }

  return rules.join("\n");
}

export function getWorkspaceClassName(refSlug: string) {
  return `workspace-${refSlug}`;
}

function toRefSlug(refName: string) {
  return refName.replace(/[^A-Za-z0-9._-]+/g, "~");
}
