import { expect, test } from "bun:test";
import { readPathLanguage } from "./language-header";

test("reads the language prefix of translated docs paths only", () => {
  expect(readPathLanguage("/ru/docs/dev/faq")).toBe("ru");
  expect(readPathLanguage("/pt-BR/docs")).toBe("pt-BR");
  expect(readPathLanguage("/docs/dev")).toBeUndefined();
  expect(readPathLanguage("/assets/ru/docs")).toBeUndefined();
});
