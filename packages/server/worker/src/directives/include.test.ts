import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveIncludeDirectives } from "./include";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("leaves the frontmatter of an included partial out of the page", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "scriptorium-include-"));
  roots.push(root);
  await mkdir(path.join(root, "_partials"), { recursive: true });
  await writeFile(path.join(root, "page.mdx"), "---\ntitle: Страница\n---\n\nДо.\n\n<Include src=\"./_partials/note.mdx\" />\n\nПосле.\n");
  await writeFile(path.join(root, "_partials", "note.mdx"), "---\nsourceHash: 8d3f0a1c2b9e4f6a7c5d1e0b3a2f9c8d7e6b5a4f\n---\n\nЗаметка.\n");

  const included = await resolveIncludeDirectives(root);
  const page = await readFile(path.join(root, "page.mdx"), "utf8");

  expect(page).toBe("---\ntitle: Страница\n---\n\nДо.\n\nЗаметка.\n\n\nПосле.\n");
  expect(included.get("page.mdx")).toEqual(["_partials/note.mdx"]);
});
