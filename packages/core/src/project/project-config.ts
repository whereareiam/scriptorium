import { readFile } from "node:fs/promises";
import { z } from "zod";
import { resolveProjectPaths } from "./project-paths";

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
  theme: refThemeSchema.optional()
});

const publishedVersionIncludeRuleSchema = z.union([
  z.object({
    type: z.literal("branch"),
    name: z.string().min(1)
  }),
  z.object({
    type: z.literal("branch"),
    pattern: z.string().min(1)
  }),
  z.object({
    type: z.literal("tag"),
    name: z.string().min(1)
  }),
  z.object({
    type: z.literal("tag"),
    pattern: z.string().min(1)
  })
]);

const publishedVersionsSchema = z.object({
  home: z.string().min(1),
  include: z.array(publishedVersionIncludeRuleSchema).default([]),
  meta: z.record(z.string(), refMetadataSchema).default({})
});

const projectUrlsSchema = z.object({
  github: z.string().min(1).optional()
}).optional();

export const projectConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  logo: z.string().min(1),
  favicon: z.string().min(1).optional(),
  urls: projectUrlsSchema,
  versions: publishedVersionsSchema
});

export type PublishedVersionIncludeRule = z.infer<typeof publishedVersionIncludeRuleSchema>;
export type RefMetadata = z.infer<typeof refMetadataSchema>;
export type ScriptoriumProjectConfig = z.infer<typeof projectConfigSchema>;

export async function loadProjectConfig(projectRoot = process.cwd()) {
  const { configPath } = resolveProjectPaths(projectRoot);
  const raw = await readFile(configPath, "utf8");

  return projectConfigSchema.parse(JSON.parse(raw));
}
