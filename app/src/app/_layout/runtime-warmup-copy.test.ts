import { describe, expect, it } from "bun:test";
import {
  DEFAULT_BUNDLING_CAPTIONS,
  nextBundlingCaptionIndex,
  resolveBundlingCaption,
  resolveBundlingCaptions
} from "./runtime-warmup-copy";

describe("runtime warmup copy", () => {
  it("falls back to default captions when the project does not define any", () => {
    expect(resolveBundlingCaptions()).toEqual([...DEFAULT_BUNDLING_CAPTIONS]);
  });

  it("uses source-defined captions when present", () => {
    expect(resolveBundlingCaptions({
      state: {
        bundling: {
          captions: ["One", "Two"]
        }
      }
    })).toEqual(["One", "Two"]);
  });

  it("keeps a single caption static", () => {
    expect(nextBundlingCaptionIndex(0, ["Only one"])).toBe(0);
    expect(resolveBundlingCaption(["Only one"], 5)).toBe("Only one");
  });

  it("rotates across multiple captions", () => {
    const captions = ["One", "Two", "Three"];

    expect(resolveBundlingCaption(captions, 0)).toBe("One");
    expect(nextBundlingCaptionIndex(0, captions)).toBe(1);
    expect(resolveBundlingCaption(captions, 1)).toBe("Two");
    expect(nextBundlingCaptionIndex(2, captions)).toBe(0);
  });
});
