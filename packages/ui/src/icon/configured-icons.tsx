import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createElement, type ReactElement, type SVGProps } from "react";

const ICON_NAME_ALIASES: Record<string, keyof typeof Icons> = {
  messagecircle: "MessageCircle"
};

const CUSTOM_ICONS = {
  github: GitHubIcon,
  discord: DiscordIcon
} satisfies Record<string, (props: SVGProps<SVGSVGElement>) => ReactElement>;

export function createConfiguredIcon(iconName: string) {
  return createElement(resolveConfiguredIcon(iconName), {});
}

function resolveConfiguredIcon(iconName: string): LucideIcon {
  const normalized = normalizeIconName(iconName);
  const custom = CUSTOM_ICONS[normalized as keyof typeof CUSTOM_ICONS];
  if (custom) {
    return custom as unknown as LucideIcon;
  }

  const direct = Icons[iconName as keyof typeof Icons];
  if (typeof direct === "function") {
    return direct as LucideIcon;
  }

  const alias = ICON_NAME_ALIASES[normalizeIconName(iconName)];
  if (alias) {
    const aliased = Icons[alias];
    if (typeof aliased === "function") {
      return aliased as LucideIcon;
    }
  }

  for (const [key, value] of Object.entries(Icons)) {
    if (normalizeIconName(key) === normalized && typeof value === "function") {
      return value as LucideIcon;
    }
  }

  return Icons.ExternalLink;
}

function normalizeIconName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function GitHubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.42-4.04-1.42-.55-1.38-1.33-1.74-1.33-1.74-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.23 1.84 1.23 1.08 1.83 2.82 1.3 3.5.99.11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.32-5.47-5.86 0-1.29.47-2.35 1.23-3.17-.12-.3-.53-1.52.12-3.16 0 0 1-.32 3.3 1.21a11.5 11.5 0 0 1 6 0c2.29-1.53 3.29-1.21 3.29-1.21.66 1.64.25 2.86.12 3.16.77.82 1.23 1.88 1.23 3.17 0 4.55-2.8 5.56-5.48 5.85.43.37.82 1.1.82 2.22v3.3c0 .32.21.7.83.58A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

function DiscordIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.32 4.37a16.9 16.9 0 0 0-4.18-1.3l-.2.39-.48 1.02a15.4 15.4 0 0 0-6.92 0l-.49-1.02-.2-.4a16.9 16.9 0 0 0-4.18 1.31C1.03 8.3.32 12.14.68 15.94a16.94 16.94 0 0 0 5.12 2.58l1.1-1.8a10.92 10.92 0 0 1-1.73-.84l.43-.33.42-.35a12.08 12.08 0 0 0 11.96 0l.43.35.42.33c-.54.33-1.13.61-1.74.84l1.1 1.8a16.9 16.9 0 0 0 5.12-2.58c.43-4.4-.73-8.2-3.03-11.57ZM9.56 13.62c-1.16 0-2.1-1.05-2.1-2.35s.93-2.35 2.1-2.35c1.16 0 2.1 1.06 2.09 2.35 0 1.3-.93 2.35-2.09 2.35Zm4.88 0c-1.16 0-2.1-1.05-2.09-2.35 0-1.3.93-2.35 2.09-2.35 1.17 0 2.1 1.06 2.1 2.35s-.93 2.35-2.1 2.35Z" />
    </svg>
  );
}
