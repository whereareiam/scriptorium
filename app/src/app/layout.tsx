import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";
import { buildWorkspaceThemeStylesheet, getProjectConfig } from "@/scriptorium";
import { resolveProjectAssetUrl, resolveProjectFaviconUrl } from "./_layout/project-assets";
import { WorkspaceBody } from "./_layout/workspace-body";
import "./global.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const project = await getProjectConfig();
  const faviconUrl = resolveProjectFaviconUrl(project);
  const logoUrl = resolveProjectAssetUrl(project.logo);

  return {
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: faviconUrl },
        { url: logoUrl }
      ],
      shortcut: ["/favicon.ico"],
      apple: [{ url: logoUrl }]
    }
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const project = await getProjectConfig();
  const workspaceThemeCss = buildWorkspaceThemeStylesheet(project);

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <WorkspaceBody>
        {workspaceThemeCss ? <style>{workspaceThemeCss}</style> : null}
        <RootProvider theme={{ enabled: false }}>{children}</RootProvider>
      </WorkspaceBody>
    </html>
  );
}
