import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveIncludeDirectives } from "../../directives/include";
import { gitBlobHash } from "./git-blob-hash";
import { buildTranslation, resolvePageState } from "./build-translation";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("buildTranslation", () => {
  test("lays translations over the default content and tells their state", async () => {
    const root = await createRoot();
    const defaultDir = path.join(root, "content");
    const translationDir = path.join(root, "i18n", "ru");
    const setup = "---\ntitle: Setup\n---\n\nInstall it.\n";
    const faq = "---\ntitle: FAQ\n---\n\nQuestions.\n";

    await write(defaultDir, "meta.json", JSON.stringify({ title: "Docs", pages: ["---Start---", "index", "setup", "faq"] }));
    await write(defaultDir, "index.mdx", "---\ntitle: Home\n---\n\nWelcome.\n");
    await write(defaultDir, "setup.mdx", setup);
    await write(defaultDir, "faq.mdx", faq);
    await write(translationDir, "meta.json", JSON.stringify({ title: "Документация", labels: { Start: "Начало" } }));
    await write(translationDir, "setup.mdx", translated("Установка", setup, "Установите."));
    await write(translationDir, "faq.mdx", translated("Вопросы", "an older faq", "Вопросы."));
    await write(translationDir, "removed.mdx", translated("Удалено", "gone", "Нет такой страницы."));

    const translation = await buildTranslation({
      language: "ru",
      defaultContentDir: defaultDir,
      translationDir,
      outputDir: path.join(root, "out")
    });

    expect(Object.fromEntries(translation.states)).toEqual({
      "faq.mdx": "outdated",
      "index.mdx": "untranslated",
      "setup.mdx": "translated"
    });
    expect(translation.orphans).toEqual(["removed.mdx"]);
    expect(await readFile(path.join(root, "out", "setup.mdx"), "utf8")).toContain("Установите.");
    expect(await readFile(path.join(root, "out", "index.mdx"), "utf8")).toContain("Welcome.");
    expect(JSON.parse(await readFile(path.join(root, "out", "meta.json"), "utf8"))).toEqual({
      title: "Документация",
      pages: ["---Начало---", "index", "setup", "faq"]
    });
  });

  test("uses translated partials, falls back to default ones, and lets outdated partials mark pages", async () => {
    const root = await createRoot();
    const defaultDir = path.join(root, "content");
    const translationDir = path.join(root, "i18n", "ru");
    const note = "A note.\n";
    const page = "---\ntitle: Page\n---\n\n<Include src=\"./_partials/note.mdx\" />\n\n<Include src=\"./_partials/code.mdx\" />\n";

    await write(defaultDir, "page.mdx", page);
    await write(defaultDir, "_partials/note.mdx", note);
    await write(defaultDir, "_partials/code.mdx", "```yaml\nkey: value\n```\n");
    await write(translationDir, "page.mdx", page.replace("title: Page", `title: Страница\nsourceHash: ${hash(page)}`));
    await write(translationDir, "_partials/note.mdx", `---\nsourceHash: ${hash("an older note\n")}\n---\n\nЗаметка.\n`);

    const translation = await buildTranslation({
      language: "ru",
      defaultContentDir: defaultDir,
      translationDir,
      outputDir: path.join(root, "out")
    });
    const includedPartials = await resolveIncludeDirectives(translation.contentDir);
    const expanded = await readFile(path.join(root, "out", "page.mdx"), "utf8");

    expect(expanded).toContain("Заметка.");
    expect(expanded).toContain("key: value");
    expect(translation.states.get("page.mdx")).toBe("translated");
    expect(resolvePageState(translation, "page.mdx", includedPartials)).toBe("outdated");
  });
});

function translated(title: string, source: string, body: string) {
  return `---\ntitle: ${title}\nsourceHash: ${hash(source)}\n---\n\n${body}\n`;
}

function hash(content: string) {
  return gitBlobHash(Buffer.from(content));
}

async function createRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "scriptorium-translation-"));
  roots.push(root);
  return root;
}

async function write(dir: string, relativePath: string, content: string) {
  const filePath = path.join(dir, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}
