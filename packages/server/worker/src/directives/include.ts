import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { remark } from "remark";
import remarkMdx from "remark-mdx";

const PARTIALS_DIR_NAME = "_partials";
const INCLUDE_ELEMENT_NAME = "Include";

type MdNode = {
  type?: string;
  name?: string | null;
  position?: {
    start?: {
      offset?: number;
    };
    end?: {
      offset?: number;
    };
  };
  attributes?: MdAttribute[];
  children?: MdNode[];
};

type MdAttribute = {
  type?: string;
  name?: string;
  value?: unknown;
};

type Fail = (reason: string, place?: unknown) => never;

export async function resolveIncludeDirectives(contentDir: string) {
  const partialDirectories: string[] = [];
  const files = await collectContentFiles(contentDir, partialDirectories);

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    const expandedContent = await expandFileContent(contentDir, filePath, content, []);
    if (expandedContent !== content)
      await writeFile(filePath, expandedContent);
  }

  for (const partialDirectory of partialDirectories) {
    await rm(partialDirectory, { recursive: true, force: true });
  }
}

async function collectContentFiles(rootDir: string, partialDirectories: string[]): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === PARTIALS_DIR_NAME) {
        partialDirectories.push(entryPath);
        continue;
      }

      files.push(...await collectContentFiles(entryPath, partialDirectories));
      continue;
    }

    if (!/\.(md|mdx)$/i.test(entry.name))
      continue;

    files.push(entryPath);
  }

  return files;
}

async function expandFileContent(
  contentDir: string,
  currentFile: string,
  content: string,
  chain: string[]
) {
  const fail = createFail(contentDir, currentFile);
  const tree = remark().use(remarkMdx).parse(content) as MdNode;
  const replacements: Array<{
    start: number;
    end: number;
    content: string;
  }> = [];

  await collectIncludeReplacements(contentDir, tree, currentFile, chain, fail, replacements);
  return applyReplacements(content, replacements);
}

function isIncludeElement(node: MdNode) {
  return node.type === "mdxJsxFlowElement" && node.name === INCLUDE_ELEMENT_NAME;
}

function getStringAttribute(node: MdNode, name: string) {
  const value = node.attributes?.find((attribute) => attribute.type === "mdxJsxAttribute" && attribute.name === name)?.value;
  return typeof value === "string" ? value : undefined;
}

async function collectIncludeReplacements(
  contentDir: string,
  node: MdNode,
  currentFile: string,
  chain: string[],
  fail: Fail,
  replacements: Array<{
    start: number;
    end: number;
    content: string;
  }>
) {
  if (!Array.isArray(node.children))
    return;

  for (const child of node.children) {
    if (isIncludeElement(child)) {
      const src = getStringAttribute(child, "src");
      if (!src)
        fail(`<${INCLUDE_ELEMENT_NAME} /> requires a string "src" attribute.`, child.position);

      const partialPath = resolvePartialPath(contentDir, currentFile, src, child, fail);
      const replacement = await loadIncludedContent(contentDir, partialPath, currentFile, chain, fail);
      replacements.push({
        ...getNodeRange(child, fail),
        content: replacement
      });
      continue;
    }

    await collectIncludeReplacements(contentDir, child, currentFile, chain, fail, replacements);
  }
}

async function loadIncludedContent(
  contentDir: string,
  partialPath: string,
  currentFile: string,
  chain: string[],
  fail: Fail
) {
  const nextChain = [...chain, currentFile];
  if (nextChain.includes(partialPath)) {
    const includeChain = [...nextChain, partialPath]
      .map((entry) => path.relative(contentDir, entry) || path.basename(entry))
      .join(" -> ");

    fail(`Circular partial include detected: ${includeChain}`);
  }

  let content: string | undefined;
  try {
    content = await readFile(partialPath, "utf8");
  } catch {
    fail(`Unable to read included partial "${path.relative(contentDir, partialPath)}".`);
  }

  if (content === undefined)
    fail(`Unable to read included partial "${path.relative(contentDir, partialPath)}".`);

  return expandFileContent(contentDir, partialPath, content, nextChain);
}

function resolvePartialPath(
  contentDir: string,
  currentFile: string,
  src: string,
  node: MdNode,
  fail: Fail
) {
  const resolved = path.resolve(path.dirname(currentFile), src);
  const relative = path.relative(contentDir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative))
    fail(`Included partial "${src}" must stay inside docs/content.`, node.position);

  if (!relative.split(path.sep).includes(PARTIALS_DIR_NAME))
    fail(`Included partial "${src}" must live under "${PARTIALS_DIR_NAME}/".`, node.position);

  if (!/\.(md|mdx)$/i.test(resolved))
    fail(`Included partial "${src}" must be a ".md" or ".mdx" file.`, node.position);

  return resolved;
}

function getNodeRange(node: MdNode, fail: Fail): { start: number; end: number; } {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  if (typeof start !== "number" || typeof end !== "number")
    fail("Unable to resolve the source range for an include directive.", node.position);

  return { start, end };
}

function applyReplacements(
  content: string,
  replacements: Array<{
    start: number;
    end: number;
    content: string;
  }>
) {
  return replacements
    .sort((left, right) => right.start - left.start)
    .reduce((nextContent, replacement) => {
      return `${nextContent.slice(0, replacement.start)}${replacement.content}${nextContent.slice(replacement.end)}`;
    }, content);
}

function createFail(contentDir: string, filePath: string): Fail {
  return (reason: string, _place?: unknown) => {
    const relativePath = path.relative(contentDir, filePath) || path.basename(filePath);
    throw new Error(`${relativePath}: ${reason}`);
  };
}
