import { describe, expect, it } from "vitest";
import { parseRunningSession } from "./running";

describe("parseRunningSession", () => {
  it("parses a valid running-session file", () => {
    const raw = JSON.stringify({
      pid: 42905,
      sessionId: "1864eb4a-5226-4aff-afb5-7238b55debc7",
      cwd: "/Users/me/repo",
      entrypoint: "claude-desktop",
    });

    expect(parseRunningSession(raw)).toEqual({
      pid: 42905,
      sessionId: "1864eb4a-5226-4aff-afb5-7238b55debc7",
      cwd: "/Users/me/repo",
      entrypoint: "claude-desktop",
    });
  });

  it("defaults missing cwd and entrypoint", () => {
    const raw = JSON.stringify({ pid: 1, sessionId: "s" });
    expect(parseRunningSession(raw)).toEqual({
      pid: 1,
      sessionId: "s",
      cwd: "",
      entrypoint: null,
    });
  });

  it("returns null for missing required fields or invalid json", () => {
    expect(parseRunningSession(JSON.stringify({ pid: 1 }))).toBeNull();
    expect(parseRunningSession(JSON.stringify({ sessionId: "s" }))).toBeNull();
    expect(parseRunningSession("not json")).toBeNull();
  });
});
