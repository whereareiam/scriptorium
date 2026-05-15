import { describe, expect, it } from "bun:test";
import type { BundleManifest } from "@scriptorium/bundle";
import { createBundledSiteAccess } from "./bundled-site-access";

describe("createBundledSiteAccess", () => {
  it("reloads bundled site metadata after invalidation", async () => {
    let bundle = createBundleManifest("First Project");
    const siteAccess = createBundledSiteAccess({
      getLocalProjectRoot: () => "/project",
      isRuntimeBundleEnabled: () => false,
      ensureRuntimeSnapshot: async () => undefined,
      ensureLocalBundle: async () => undefined,
      getRuntimeBundleDir: () => "/runtime/bundle",
      readBundleManifest: async () => bundle
    });

    const original = await siteAccess.getProjectConfig();
    bundle = createBundleManifest("Second Project");
    const cached = await siteAccess.getProjectConfig();
    siteAccess.invalidate();
    const reloaded = await siteAccess.getProjectConfig();

    expect(original.name).toBe("First Project");
    expect(cached.name).toBe("First Project");
    expect(reloaded.name).toBe("Second Project");
  });

  function createBundleManifest(name: string): BundleManifest {
    return {
      generatedAt: new Date().toISOString(),
      projectRoot: "/project",
      repoRoot: "/project",
      project: {
        name,
        logo: "docs/assets/logo.svg",
        versions: {
          home: "dev",
          include: [],
          meta: {}
        }
      },
      versions: [
        {
          name: "dev",
          kind: "branch",
          fullName: "refs/heads/dev",
          objectName: "dev",
          contentDir: "/project/docs/content",
          assetsDir: "/project/docs/assets",
          configPath: "/project/scriptorium.project.json"
        }
      ]
    };
  }
});
