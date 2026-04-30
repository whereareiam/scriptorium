import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";
import { buildWorkspaceThemeStylesheet, getProjectConfig } from "@/scriptorium";
import { WorkspaceBody } from "./_layout/workspace-body";
import "./global.css";

export const dynamic = "force-dynamic";

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
