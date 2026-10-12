import { expect, test } from "bun:test";
import { mergeTranslatedMeta } from "./merge-translated-meta";

test("keeps the default pages and translates their labels", () => {
  const merged = mergeTranslatedMeta({
    title: "Docs",
    pages: ["---Getting Started---", "index", "[GitHub](https://github.com/x)", "external:[Discord](https://d.x)", "faq"]
  }, {
    title: "Документация",
    labels: {
      "Getting Started": "Начало работы",
      Discord: "Дискорд"
    },
    pages: ["faq"]
  });

  expect(merged).toEqual({
    title: "Документация",
    pages: ["---Начало работы---", "index", "[GitHub](https://github.com/x)", "external:[Дискорд](https://d.x)", "faq"]
  });
});

test("keeps the default pages untouched without labels", () => {
  expect(mergeTranslatedMeta({ pages: ["index"] }, { title: "Раздел" })).toEqual({
    title: "Раздел",
    pages: ["index"]
  });
});
