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

describe("projectConfigSchema i18n", () => {
  const base = {
    name: "Identica",
    logo: "docs/assets/logo.svg",
    versions: { home: "dev", include: [], meta: {} }
  };

  it("parses languages with the default among them", () => {
    const parsed = projectConfigSchema.parse({
      ...base,
      i18n: {
        default: "en",
        languages: { en: { label: "English" }, ru: { label: "Русский" } }
      }
    });

    expect(parsed.i18n?.default).toBe("en");
    expect(Object.keys(parsed.i18n?.languages ?? {})).toEqual(["en", "ru"]);
  });

  it("rejects a default language that is not listed", () => {
    expect(() => projectConfigSchema.parse({
      ...base,
      i18n: { default: "en", languages: { ru: { label: "Русский" } } }
    })).toThrow("i18n.languages must contain the default language.");
  });

  it("rejects language codes that cannot be a path segment", () => {
    expect(() => projectConfigSchema.parse({
      ...base,
      i18n: { default: "en", languages: { en: { label: "English" }, "../x": { label: "X" } } }
    })).toThrow();
  });
});
