import { describe, expect, test } from "bun:test";
import { parseDocsPathname, toLanguagePathname } from "./language-pathname";

describe("parseDocsPathname", () => {
  test("reads a default-language page", () => {
    expect(parseDocsPathname("/docs/dev/configuration/index")).toEqual({
      language: undefined,
      refSlug: "dev",
      pageSegments: ["configuration", "index"]
    });
  });

  test("reads a translated page", () => {
    expect(parseDocsPathname("/ru/docs/dev/faq")).toEqual({
      language: "ru",
      refSlug: "dev",
      pageSegments: ["faq"]
    });
  });

  test("ignores paths outside the docs", () => {
    expect(parseDocsPathname("/assets/logo.png")).toBeUndefined();
  });
});

describe("toLanguagePathname", () => {
  test("adds the prefix of a translated language", () => {
    expect(toLanguagePathname("/docs/dev/faq", "ru", "en")).toBe("/ru/docs/dev/faq");
  });

  test("drops the prefix for the default language", () => {
    expect(toLanguagePathname("/ru/docs/dev/faq", "en", "en")).toBe("/docs/dev/faq");
  });

  test("switches between two translated languages", () => {
    expect(toLanguagePathname("/ru/docs/1.0.0", "de", "en")).toBe("/de/docs/1.0.0");
  });

  test("falls back to the docs root outside the docs", () => {
    expect(toLanguagePathname("/", "ru", "en")).toBe("/ru/docs");
  });
});
