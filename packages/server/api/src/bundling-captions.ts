import type { ScriptoriumProjectConfig } from "./models/scriptorium-project-config";

export const DEFAULT_BUNDLING_CAPTIONS = [
  "Linking the latest documentation pages.",
  "Preparing examples and reference material.",
  "Warming up search for fast lookups."
] as const;

export function resolveBundlingCaptions(project?: Pick<ScriptoriumProjectConfig, "state"> | null) {
  const captions = project?.state?.bundling?.captions?.filter((caption) => caption.trim().length > 0);
  if (!captions || captions.length === 0) {
    return [...DEFAULT_BUNDLING_CAPTIONS];
  }

  return captions;
}
