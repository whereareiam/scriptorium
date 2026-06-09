import { describe, expect, it } from "bun:test";
import { projectConfigSchema } from "./schema/project-config-schema";

describe("projectConfigSchema", () => {
  it("parses links, versions, and bundling captions", () => {
    const parsed = projectConfigSchema.parse({
      name: "Identica",
      description: "Docs",
      logo: "docs/assets/logo.svg",
      state: {
        bundling: {
          captions: ["One", "Two"]
        }
      },
      links: [{
        type: "icon",
        icon: "github",
        label: "GitHub",
        url: "https://github.com/example/repo"
      }],
      versions: {
        home: "dev",
        include: [
          { type: "branch", pattern: "release/*" },
          { type: "tag", pattern: "*" }
        ],
        meta: {
          dev: {
            label: "Development"
          }
        }
      }
    });

    expect(parsed.versions.home).toBe("dev");
    expect(parsed.state?.bundling?.captions).toEqual(["One", "Two"]);
    expect(parsed.links?.[0]?.type).toBe("icon");
  });
});
