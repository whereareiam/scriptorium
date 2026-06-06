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

const projectLinkTargetSchema = z.object({
  url: z.string().min(1),
  external: z.boolean().optional(),
  on: z.enum(["menu", "nav", "all"]).optional(),
  active: z.enum(["url", "nested-url", "none"]).optional()
});

const projectMainLinkSchema = projectLinkTargetSchema.extend({
  type: z.literal("main"),
  text: z.string().min(1),
  icon: z.string().min(1).optional(),
  description: z.string().min(1).optional()
});

const projectButtonLinkSchema = projectLinkTargetSchema.extend({
  type: z.literal("button"),
  text: z.string().min(1),
  icon: z.string().min(1).optional(),
  secondary: z.boolean().optional()
});

const projectIconLinkSchema = projectLinkTargetSchema.extend({
  type: z.literal("icon"),
  icon: z.string().min(1),
  label: z.string().min(1),
  text: z.string().min(1).optional(),
  secondary: z.boolean().optional()
});

const projectLinksSchema = z.array(
  z.discriminatedUnion("type", [
    projectMainLinkSchema,
    projectButtonLinkSchema,
    projectIconLinkSchema
  ])
).optional();

export const projectConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  logo: z.string().min(1),
  favicon: z.string().min(1).optional(),
  state: z.object({
    bundling: z.object({
      captions: z.array(z.string().trim().min(1)).min(1).optional()
    }).optional()
  }).optional(),
  urls: z.record(z.string(), z.string().min(1)).optional(),
  links: projectLinksSchema,
  versions: publishedVersionsSchema
});

export type PublishedVersionIncludeRule = z.infer<typeof publishedVersionIncludeRuleSchema>;
export type RefMetadata = z.infer<typeof refMetadataSchema>;
export type ProjectLink = NonNullable<z.infer<typeof projectLinksSchema>>[number];
export type ScriptoriumProjectConfig = z.infer<typeof projectConfigSchema>;

export async function loadProjectConfig(projectRoot = process.cwd()) {
  const { configPath } = resolveProjectPaths(projectRoot);
  const raw = await readFile(configPath, "utf8");

  return projectConfigSchema.parse(JSON.parse(raw));
}
