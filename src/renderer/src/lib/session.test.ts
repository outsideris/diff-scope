import { describe, expect, it } from "vitest";
import type { SessionInfo, SessionState } from "../../../shared/session";
import { countSessions, groupSessionsByDir, isDimmed, stateLabel } from "./session";

function session(cwd: string, state: SessionState): SessionInfo {
  return {
    id: `${cwd}:${state}`,
    app: "claude",
    title: "t",
    state,
    cwd,
    branch: null,
    lastActivityAt: null,
  };
}

describe("groupSessionsByDir", () => {
  it("groups sessions by cwd, ignoring trailing slashes", () => {
    const groups = groupSessionsByDir([
      session("/a/wt", "active"),
      session("/a/wt/", "running"),
      session("/b", "archived"),
    ]);

    expect(Object.keys(groups).sort()).toEqual(["/a/wt", "/b"]);
    expect(groups["/a/wt"]).toHaveLength(2);
    expect(groups["/b"]).toHaveLength(1);
  });
});

describe("countSessions", () => {
  it("counts totals, running, and live (running + active)", () => {
    const counts = countSessions([
      session("/a", "running"),
      session("/a", "active"),
      session("/a", "archived"),
      session("/a", "deleted"),
    ]);

    expect(counts).toEqual({ total: 4, running: 1, live: 2 });
  });
});

describe("stateLabel / isDimmed", () => {
  it("labels states in Korean and dims archived/deleted", () => {
    expect(stateLabel("running")).toBe("실행 중");
    expect(stateLabel("deleted")).toBe("삭제됨");
    expect(isDimmed("archived")).toBe(true);
    expect(isDimmed("deleted")).toBe(true);
    expect(isDimmed("active")).toBe(false);
    expect(isDimmed("running")).toBe(false);
  });
});
