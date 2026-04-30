import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const runtimeConfigSchema = z.object({
  source: z.object({
    type: z.enum(["local", "git"]).default("local"),
    target: z.string().min(1).optional(),
    defaultBranch: z.string().min(1).default("dev"),
    auth: z.object({
      token: z.string().optional(),
      username: z.string().min(1).default("x-access-token")
    }).default({
      username: "x-access-token"
    })
  }).default({
    type: "local",
    defaultBranch: "dev",
    auth: {
      username: "x-access-token"
    }
  }),
  runtime: z.object({
    refreshIntervalSeconds: z.coerce.number().int().positive().default(900),
    dataDir: z.string().min(1).default(path.resolve(process.cwd(), ".scriptorium", "runtime"))
  }).default({
    refreshIntervalSeconds: 900,
    dataDir: path.resolve(process.cwd(), ".scriptorium", "runtime")
  }),
  triggers: z.object({
    webhook: z.object({
      secret: z.string().optional()
    }).optional()
  }).optional()
}).superRefine((config, context) => {
  if (!config.source.target) {
    return;
  }

  if (config.source.type === "git" && !config.source.target) {
    context.addIssue({
      code: "custom",
      path: ["source", "target"],
      message: "source.target is required when source.type is git."
    });
  }
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

const runtimeConfigPath = path.resolve(process.cwd(), "scriptorium.json");

export function getRuntimeConfig() {
  return runtimeConfigSchema.parse(readRuntimeConfigFile());
}

export function getLocalProjectRoot() {
  const config = getRuntimeConfig();
  if (config.source.type === "local" && config.source.target) {
    return path.resolve(config.source.target);
  }

  return path.resolve(process.cwd(), "..", "example");
}

function readRuntimeConfigFile() {
  if (!existsSync(runtimeConfigPath)) {
    return {};
  }

  const raw = readFileSync(runtimeConfigPath, "utf8");
  return JSON.parse(raw) as unknown;
}
