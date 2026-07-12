import { describe, expect, it } from "vitest";
import { relativeDate, shortenPath, splitPath } from "./format";

describe("splitPath", () => {
  it("splits a path into directory and file name", () => {
    expect(splitPath("src/shared/ipc.ts")).toEqual({ dir: "src/shared/", name: "ipc.ts" });
    expect(splitPath("README.md")).toEqual({ dir: "", name: "README.md" });
  });
});

describe("shortenPath", () => {
  it("keeps only the last two segments of an absolute path", () => {
    expect(shortenPath("/Users/me/projects/vibe-coding/diff-scope")).toEqual({
      prefix: "…/vibe-coding/",
      base: "diff-scope",
    });
    expect(shortenPath("/repo")).toEqual({ prefix: "", base: "repo" });
    expect(shortenPath("/a/b/")).toEqual({ prefix: "…/a/", base: "b" });
  });
});

describe("relativeDate", () => {
  const now = new Date("2026-07-12T10:00:00+09:00");

  it("renders today, yesterday, and n days ago", () => {
    expect(relativeDate("2026-07-12T01:00:00+09:00", now)).toBe("오늘");
    expect(relativeDate("2026-07-11T23:59:00+09:00", now)).toBe("어제");
    expect(relativeDate("2026-07-08T09:00:00+09:00", now)).toBe("4일 전");
  });

  it("falls back to a locale date for older commits and raw input for invalid dates", () => {
    expect(relativeDate("2026-06-01T09:00:00+09:00", now)).toBe(
      new Date("2026-06-01T09:00:00+09:00").toLocaleDateString(),
    );
    expect(relativeDate("not-a-date", now)).toBe("not-a-date");
  });
});
