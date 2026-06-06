import type { ScriptoriumProjectConfig } from "@scriptorium/core";

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

export function resolveBundlingCaption(captions: string[], index: number) {
  if (captions.length === 0) {
    return DEFAULT_BUNDLING_CAPTIONS[0];
  }

  return captions[index % captions.length] ?? captions[0] ?? DEFAULT_BUNDLING_CAPTIONS[0];
}

export function nextBundlingCaptionIndex(currentIndex: number, captions: string[]) {
  if (captions.length <= 1) {
    return 0;
  }

  return (currentIndex + 1) % captions.length;
}
