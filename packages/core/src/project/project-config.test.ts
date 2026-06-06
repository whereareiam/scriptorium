import { describe, expect, it } from "bun:test";
import { projectConfigSchema } from "./project-config";

describe("projectConfigSchema", () => {
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
