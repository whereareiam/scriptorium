import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { runtimeConfigSchema, type RuntimeConfig } from "./schema/runtime-config-schema";

export type { RuntimeConfig } from "./schema/runtime-config-schema";

export interface RuntimePaths {
  repoDir: string;
  generationsDir: string;
  stateFile: string;
}

export function loadRuntimeConfig(): RuntimeConfig {
  const runtimeConfigPath = path.resolve(process.cwd(), "scriptorium.json");
  if (!existsSync(runtimeConfigPath)) {
    return runtimeConfigSchema.parse({});
  }

  const raw = readFileSync(runtimeConfigPath, "utf8");
  return runtimeConfigSchema.parse(JSON.parse(raw) as unknown);
}

export function resolveRuntimePaths(config: RuntimeConfig): RuntimePaths {
  return {
    repoDir: path.join(config.runtime.dataDir, "repo"),
    generationsDir: path.join(config.runtime.dataDir, "generations"),
    stateFile: path.join(config.runtime.dataDir, "state.json")
  };
}

export function resolveLocalProjectRoot(config: RuntimeConfig) {
  if (config.source.type === "local" && config.source.target) {
    return path.resolve(config.source.target);
  }

  return path.resolve(process.cwd(), "..", "example");
}
