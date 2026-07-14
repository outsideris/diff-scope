import { describe, expect, it } from "vitest";
import { resolveState } from "./state";

describe("resolveState", () => {
  it("prioritizes running over every other state", () => {
    expect(resolveState({ isRunning: true, hasTranscript: false, isArchived: true })).toBe(
      "running",
    );
  });

  it("reports deleted when the transcript is gone", () => {
    expect(resolveState({ isRunning: false, hasTranscript: false, isArchived: true })).toBe(
      "deleted",
    );
    expect(resolveState({ isRunning: false, hasTranscript: false, isArchived: false })).toBe(
      "deleted",
    );
  });

  it("reports archived only when a transcript exists and it is archived", () => {
    expect(resolveState({ isRunning: false, hasTranscript: true, isArchived: true })).toBe(
      "archived",
    );
  });

  it("reports active for a normal session", () => {
    expect(resolveState({ isRunning: false, hasTranscript: true, isArchived: false })).toBe(
      "active",
    );
  });
});
