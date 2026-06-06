import { describe, expect, it } from "bun:test";
import { projectConfigSchema } from "./project-config";

describe("projectConfigSchema", () => {
  it("accepts flexible project urls and icon links", () => {
    const parsed = projectConfigSchema.parse({
      name: "Identica",
      logo: "docs/assets/logo.png",
      urls: {
        github: "https://github.com/whereareiam/Identica",
        website: "https://identica.whereareiam.me"
      },
      links: [
        {
          type: "icon",
          label: "GitHub",
          icon: "github",
          url: "https://github.com/whereareiam/Identica"
        },
        {
          type: "button",
          text: "Download",
          icon: "download",
          url: "https://example.invalid/download"
        }
      ],
      versions: {
        home: "dev",
        include: [],
        meta: {}
      }
    });

    expect(parsed.urls?.website).toBe("https://identica.whereareiam.me");
    expect(parsed.links).toHaveLength(2);
  });

  it("accepts state.bundling.captions when provided", () => {
    const parsed = projectConfigSchema.parse({
      name: "Identica",
      logo: "docs/assets/logo.png",
      state: {
        bundling: {
          captions: [
            "Preparing the docs.",
            "Warming up search."
          ]
        }
      },
      versions: {
        home: "dev",
        include: [],
        meta: {}
      }
    });

    expect(parsed.state?.bundling?.captions).toEqual([
      "Preparing the docs.",
      "Warming up search."
    ]);
  });

  it("rejects empty caption lists", () => {
    expect(() => projectConfigSchema.parse({
      name: "Identica",
      logo: "docs/assets/logo.png",
      state: {
        bundling: {
          captions: []
        }
      },
      versions: {
        home: "dev",
        include: [],
        meta: {}
      }
    })).toThrow();
  });

  it("rejects blank captions", () => {
    expect(() => projectConfigSchema.parse({
      name: "Identica",
      logo: "docs/assets/logo.png",
      state: {
        bundling: {
          captions: ["   "]
        }
      },
      versions: {
        home: "dev",
        include: [],
        meta: {}
      }
    })).toThrow();
  });
});
