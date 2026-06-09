import { DEFAULT_BUNDLING_CAPTIONS, resolveBundlingCaptions } from "@scriptorium/server-api";

export { DEFAULT_BUNDLING_CAPTIONS, resolveBundlingCaptions };

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
