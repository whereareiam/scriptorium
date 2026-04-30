import path from "node:path";
import { z } from "zod";

const runtimeConfigSchema = z.object({
  repoUrl: z.string().min(1),
  defaultBranch: z.string().min(1).default("dev"),
  refreshIntervalSeconds: z.coerce.number().int().positive().default(900),
  dataDir: z.string().min(1).default(path.resolve(process.cwd(), ".scriptorium", "runtime")),
  webhookSecret: z.string().optional(),
  gitAuthToken: z.string().optional()
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

export function getRuntimeConfig() {
  return runtimeConfigSchema.parse({
    repoUrl: process.env.SCRIPTORIUM_REPO_URL,
    defaultBranch: process.env.SCRIPTORIUM_DEFAULT_BRANCH,
    refreshIntervalSeconds: process.env.SCRIPTORIUM_REFRESH_INTERVAL_SECONDS,
    dataDir: process.env.SCRIPTORIUM_DATA_DIR,
    webhookSecret: process.env.SCRIPTORIUM_WEBHOOK_SECRET,
    gitAuthToken: process.env.SCRIPTORIUM_GIT_AUTH_TOKEN
  });
}

export function getLocalProjectRoot() {
  if (process.env.SCRIPTORIUM_PROJECT_ROOT) {
    return path.resolve(process.env.SCRIPTORIUM_PROJECT_ROOT);
  }

  return path.join(process.cwd(), "example");
}
