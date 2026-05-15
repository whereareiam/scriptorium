import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";
import { buildWorkspaceThemeStylesheet, getProjectConfig, getRuntimeReadiness, startRuntimeWarmup } from "@/scriptorium";
import { resolveProjectAssetUrl, resolveProjectFaviconUrl } from "./_layout/project-assets";
import { RuntimeWarmupScreen } from "./_layout/runtime-warmup-screen";
import { WorkspaceBody } from "./_layout/workspace-body";
import "./global.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const readiness = await getRuntimeReadiness();
  if (!readiness.ready) {
    return {
      title: "Preparing documentation"
    };
  }

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
  const readiness = await getRuntimeReadiness();
  if (!readiness.ready) {
    startRuntimeWarmup();

    return (
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-screen bg-fd-background text-fd-foreground" suppressHydrationWarning>
          <RootProvider>
            <RuntimeWarmupScreen />
          </RootProvider>
        </body>
      </html>
    );
  }

  const project = await getProjectConfig();
  const workspaceThemeCss = buildWorkspaceThemeStylesheet(project);

  return (
    <html lang="en" suppressHydrationWarning>
      <WorkspaceBody>
        {workspaceThemeCss ? <style>{workspaceThemeCss}</style> : null}
        <RootProvider>{children}</RootProvider>
      </WorkspaceBody>
    </html>
  );
}
