import { describe, expect, it } from "bun:test";
import { createProjectLinkIcon } from "./project-links";

describe("createProjectLinkIcon", () => {
  it("creates a custom GitHub icon", () => {
    const icon = createProjectLinkIcon("github");
    expect(icon).toBeTruthy();
  });

  it("creates a custom Discord icon", () => {
    const icon = createProjectLinkIcon("discord");
    expect(icon).toBeTruthy();
  });
});
