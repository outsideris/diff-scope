import { describe, expect, it } from "vitest";
import { parseClaudeMeta } from "./claudeStore";

describe("parseClaudeMeta", () => {
  it("parses a full desktop session meta", () => {
    const raw = JSON.stringify({
      cliSessionId: "c9c16b97-2efe-43dd-9dcf-9a467b59c5ca",
      cwd: "/Users/me/repo/.claude/worktrees/foo/",
      branch: "claude/foo-123",
      title: "Mockups design refinement",
      isArchived: "True",
      lastActivityAt: "1783002248172",
      createdAt: "1782227830038",
    });

    expect(parseClaudeMeta(raw)).toEqual({
      cliSessionId: "c9c16b97-2efe-43dd-9dcf-9a467b59c5ca",
      cwd: "/Users/me/repo/.claude/worktrees/foo",
      branch: "claude/foo-123",
      title: "Mockups design refinement",
      isArchived: true,
      lastActivityAt: 1783002248172,
    });
  });

  it("falls back to createdAt and a default title, and treats empty branch as null", () => {
    const raw = JSON.stringify({
      cliSessionId: "id",
      cwd: "/r",
      branch: "",
      title: "",
      isArchived: false,
      createdAt: "1782227830038",
    });

    const meta = parseClaudeMeta(raw);
    expect(meta).toMatchObject({
      branch: null,
      title: "(제목 없음)",
      isArchived: false,
      lastActivityAt: 1782227830038,
    });
  });

  it("returns null without a cliSessionId or on invalid json", () => {
    expect(parseClaudeMeta(JSON.stringify({ cwd: "/r" }))).toBeNull();
    expect(parseClaudeMeta("{")).toBeNull();
  });
});
