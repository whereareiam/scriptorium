import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ScriptoriumProjectConfig } from "@scriptorium/server-api";
import { projectConfigSchema } from "./schema/project-config-schema";

export async function loadProjectConfig(projectRoot: string): Promise<ScriptoriumProjectConfig> {
  const raw = await readFile(path.join(projectRoot, "scriptorium.project.json"), "utf8");
  return projectConfigSchema.parse(JSON.parse(raw) as unknown);
}
