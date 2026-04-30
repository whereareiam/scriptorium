import { access } from "node:fs/promises";
import { resolveProjectPaths } from "./project-paths";

export async function assertProjectStructure(projectRoot = process.cwd()) {
  const { configPath, docsContentDir } = resolveProjectPaths(projectRoot);
  await access(configPath);
  await access(docsContentDir);
}
