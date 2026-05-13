import { readFile } from "node:fs/promises";
import path from "node:path";
import { remark } from "remark";
import remarkMdx from "remark-mdx";
import type { Plugin } from "unified";

export const PARTIALS_DIR_NAME = "_partials";
const INCLUDE_ELEMENT_NAME = "Include";

type MdNode = {
  type?: string;
  name?: string | null;
  position?: unknown;
  attributes?: MdAttribute[];
  children?: MdNode[];
};

type MdAttribute = {
  type?: string;
  name?: string;
  value?: unknown;
};

type VFileLike = {
  path?: string;
  history?: string[];
  fail: (reason: string, options?: { place?: unknown }) => never;
};

export function remarkPartialIncludes(contentDir: string): Plugin {
  const parser = remark().use(remarkMdx);

  return () => async (tree: MdNode, file: unknown) => {
    const vfile = file as VFileLike;
    const filePath = getFilePath(vfile);
    await expandIncludes(tree, filePath, [], vfile);
  };

  async function expandIncludes(node: MdNode, currentFile: string, chain: string[], file: VFileLike) {
    if (!Array.isArray(node.children))
      return;

    for (let index = 0; index < node.children.length; index++) {
      const child = node.children[index];
      if (isIncludeElement(child)) {
        const src = getStringAttribute(child, "src");
        if (!src)
          file.fail(`<${INCLUDE_ELEMENT_NAME} /> requires a string "src" attribute.`, { place: child.position });

        const includedChildren = await loadIncludedChildren(
          resolvePartialPath(contentDir, currentFile, src, child, file),
          currentFile,
          chain,
          file
        );

        node.children.splice(index, 1, ...includedChildren);
        index += includedChildren.length - 1;
        continue;
      }

      await expandIncludes(child, currentFile, chain, file);
    }
  }

  async function loadIncludedChildren(partialPath: string, currentFile: string, chain: string[], file: VFileLike) {
    const nextChain = [...chain, currentFile];
    if (nextChain.includes(partialPath)) {
      const includeChain = [...nextChain, partialPath]
        .map((entry) => path.relative(contentDir, entry) || path.basename(entry))
        .join(" -> ");

      file.fail(`Circular partial include detected: ${includeChain}`);
    }

    let content: string;
    try {
      content = await readFile(partialPath, "utf8");
    } catch {
      file.fail(`Unable to read included partial "${path.relative(contentDir, partialPath)}".`);
    }

    const partialTree = parser.parse(content) as MdNode;
    await expandIncludes(partialTree, partialPath, nextChain, file);
    return partialTree.children ?? [];
  }
}

export function isPartialContentPath(filePath: string) {
  return filePath.split("/").includes(PARTIALS_DIR_NAME);
}

function getFilePath(file: VFileLike) {
  const filePath = file.path ?? file.history?.[0];
  if (!filePath)
    throw new Error("Unable to resolve the current MDX file path for partial includes.");

  return filePath;
}

function isIncludeElement(node: MdNode) {
  return node.type === "mdxJsxFlowElement" && node.name === INCLUDE_ELEMENT_NAME;
}

function getStringAttribute(node: MdNode, name: string) {
  const value = node.attributes?.find((attribute) => attribute.type === "mdxJsxAttribute" && attribute.name === name)?.value;
  return typeof value === "string" ? value : undefined;
}

function resolvePartialPath(contentDir: string, currentFile: string, src: string, node: MdNode, file: VFileLike) {
  const resolved = path.resolve(path.dirname(currentFile), src);
  const relative = path.relative(contentDir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative))
    file.fail(`Included partial "${src}" must stay inside docs/content.`, { place: node.position });

  if (!isPartialContentPath(relative))
    file.fail(`Included partial "${src}" must live under "${PARTIALS_DIR_NAME}/".`, { place: node.position });

  if (!/\.(md|mdx)$/i.test(resolved))
    file.fail(`Included partial "${src}" must be a ".md" or ".mdx" file.`, { place: node.position });

  return resolved;
}
