import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const navigationLinkSchema = z.object({
  label: z.string().min(1),
  url: z.string().min(1)
});

const refThemeSchema = z.object({
  primary: z.string().min(1).optional(),
  primaryForeground: z.string().min(1).optional(),
  ring: z.string().min(1).optional(),
  accent: z.string().min(1).optional(),
  accentForeground: z.string().min(1).optional(),
  border: z.string().min(1).optional()
});

const refMetadataSchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  theme: refThemeSchema.optional()
});

const refRulesSchema = z.object({
  defaultBranch: z.string().default("dev"),
  releaseBranchPrefix: z.string().default("release/"),
  includeDefaultRef: z.boolean().default(true),
  includeReleaseBranches: z.boolean().default(true),
  includeTags: z.boolean().default(true),
  extraRefs: z.array(z.string()).default([])
}).default({
  defaultBranch: "dev",
  releaseBranchPrefix: "release/",
  includeDefaultRef: true,
  includeReleaseBranches: true,
  includeTags: true,
  extraRefs: []
});

export const projectConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  logo: z.string().min(1),
  defaultRef: z.string().min(1),
  refRules: refRulesSchema,
  refs: z.record(z.string(), refMetadataSchema).default({}),
  links: z.array(navigationLinkSchema).default([])
});

export type NavigationLink = z.infer<typeof navigationLinkSchema>;
export type RefMetadata = z.infer<typeof refMetadataSchema>;
export type ScriptoriumProjectConfig = z.infer<typeof projectConfigSchema>;

export function getRefMetadata(config: ScriptoriumProjectConfig, refName: string) {
  const metadata = config.refs[refName];

  return {
    name: refName,
    label: metadata?.label ?? refName,
    description: metadata?.description,
    theme: metadata?.theme
  };
}

export function resolveProjectPaths(projectRoot: string) {
  return {
    projectRoot,
    docsContentDir: path.join(projectRoot, "docs", "content"),
    docsAssetsDir: path.join(projectRoot, "docs", "assets"),
    configPath: path.join(projectRoot, "scriptorium.project.json")
  };
}

export function normalizeRepoRelativePath(input: string) {
  return input.split(path.sep).join("/");
}

export function getContractPrefixes(projectRoot: string, repoRoot: string) {
  const relativeProjectRoot = path.relative(repoRoot, projectRoot);
  const prefix = relativeProjectRoot === "" ? "" : `${normalizeRepoRelativePath(relativeProjectRoot)}/`;

  return {
    contentPrefix: `${prefix}docs/content/`,
    assetsPrefix: `${prefix}docs/assets/`,
    configPath: `${prefix}scriptorium.project.json`
  };
}

export function isBundledContractPath(relativePath: string, projectRoot = ".", repoRoot = ".") {
  const normalized = normalizeRepoRelativePath(relativePath);
  const prefixes = getContractPrefixes(projectRoot, repoRoot);

  return (
    normalized.startsWith(prefixes.contentPrefix) ||
    normalized.startsWith(prefixes.assetsPrefix) ||
    normalized === prefixes.configPath
  );
}

export function toServedAssetPath(assetPath: string) {
  if (/^https?:\/\//.test(assetPath) || assetPath.startsWith("/")) {
    return assetPath;
  }

  const normalized = normalizeRepoRelativePath(assetPath);
  if (normalized.startsWith("docs/assets/")) {
    return `/assets/${normalized.slice("docs/assets/".length)}`;
  }

  if (normalized.startsWith("assets/")) {
    return `/${normalized}`;
  }

  return `/assets/${normalized}`;
}

export async function loadProjectConfig(projectRoot = process.cwd()) {
  const { configPath } = resolveProjectPaths(projectRoot);
  const raw = await readFile(configPath, "utf8");

  return projectConfigSchema.parse(JSON.parse(raw));
}

export async function assertProjectContract(projectRoot = process.cwd()) {
  const { configPath, docsContentDir } = resolveProjectPaths(projectRoot);
  await access(configPath);
  await access(docsContentDir);
}
