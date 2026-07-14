import { describe, expect, it } from "vitest";
import { parseCodexHead } from "./codex";

function line(obj: unknown): string {
  return JSON.stringify(obj);
}

describe("parseCodexHead", () => {
  const meta = line({
    type: "session_meta",
    timestamp: "2026-07-12T07:22:24.000Z",
    payload: { id: "019f5534-b049-7962", cwd: "/Users/me/repo/", originator: "Codex Desktop" },
  });

  it("reads cwd/id from session_meta and the first non-tag user message as title", () => {
    const head = [
      meta,
      line({
        type: "response_item",
        payload: {
          type: "message",
          role: "developer",
          content: [{ type: "input_text", text: "<permissions>" }],
        },
      }),
      line({
        type: "response_item",
        payload: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "<recommended_plugins>\n..." }],
        },
      }),
      line({
        type: "response_item",
        payload: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "실제 첫 프롬프트\n둘째 줄" }],
        },
      }),
    ].join("\n");

    expect(parseCodexHead(head)).toEqual({
      id: "019f5534-b049-7962",
      cwd: "/Users/me/repo",
      title: "실제 첫 프롬프트",
      lastActivityAt: Date.parse("2026-07-12T07:22:24.000Z"),
    });
  });

  it("uses a default title when no real user message is present", () => {
    expect(parseCodexHead(meta)).toEqual({
      id: "019f5534-b049-7962",
      cwd: "/Users/me/repo",
      title: "(제목 없음)",
      lastActivityAt: Date.parse("2026-07-12T07:22:24.000Z"),
    });
  });

  it("returns null without session_meta", () => {
    expect(
      parseCodexHead(line({ type: "event_msg", payload: { type: "task_started" } })),
    ).toBeNull();
    expect(parseCodexHead("")).toBeNull();
  });
});
