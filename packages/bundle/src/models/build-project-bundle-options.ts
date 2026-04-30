import type { StageRepository } from "@scriptorium/core";

export interface BuildProjectBundleOptions {
  projectRoot?: string;
  outputDir?: string;
  repository: StageRepository;
}
