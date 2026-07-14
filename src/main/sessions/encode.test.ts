import { describe, expect, it } from "vitest";
import { encodeProjectDir, normalizePath } from "./encode";

describe("encodeProjectDir", () => {
  it("replaces slashes and dots with dashes", () => {
    expect(encodeProjectDir("/Users/me/projects/diff-scope")).toBe("-Users-me-projects-diff-scope");
  });

  it("turns a hidden worktree path into the double-dash form", () => {
    expect(encodeProjectDir("/Users/me/repo/.claude/worktrees/foo-123")).toBe(
      "-Users-me-repo--claude-worktrees-foo-123",
    );
  });
});

describe("normalizePath", () => {
  it("strips trailing slashes", () => {
    expect(normalizePath("/a/b/")).toBe("/a/b");
    expect(normalizePath("/a/b")).toBe("/a/b");
    expect(normalizePath("/a/b///")).toBe("/a/b");
  });
});
