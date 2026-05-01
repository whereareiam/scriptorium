import type { AnchorHTMLAttributes } from "react";
import { unstable_cache } from "next/cache";

export interface MavenVersionLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children"> {
  metadataUrl: string;
  hrefTemplate: string;
  selector?: "latest" | "release";
  fallbackText?: string;
}

export async function MavenVersionLink(
  {
    className,
    fallbackText = "unavailable",
    hrefTemplate,
    metadataUrl,
    selector = "latest",
    ...props
  }: MavenVersionLinkProps
) {
  const version = await resolveVersion(metadataUrl, selector);
  if (!version) {
    return <>{fallbackText}</>;
  }

  return (
    <a
      {...props}
      href={hrefTemplate.replace("{version}", version)}
      className={className}
    >
      {version}
    </a>
  );
}

const resolveVersion = unstable_cache(async (
  metadataUrl: string,
  selector: "latest" | "release"
): Promise<string | null> => {
  const response = await fetch(metadataUrl, {
    next: { revalidate: 3600 }
  }).catch(() => null);
  if (!response || !response.ok) return null;

  const xml = await response.text().catch(() => "");
  if (!xml) return null;

  const exact = readTag(xml, selector);
  if (exact) return exact;

  if (selector === "release") {
    return readTag(xml, "latest");
  }

  return null;
}, ["maven-version-link"], { revalidate: 3600 });

function readTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
  return match && match[1] ? match[1].trim() : null;
}
