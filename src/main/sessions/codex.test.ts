import { describe, expect, it } from "vitest";
import { parseCodexHead, parseLsofOpenPaths, parseSessionIndex } from "./codex";

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

  it("excludes subagent threads (thread_source or source.subagent)", () => {
    const byThreadSource = line({
      type: "session_meta",
      payload: { id: "sub-1", cwd: "/Users/me/repo", thread_source: "subagent" },
    });
    const bySource = line({
      type: "session_meta",
      payload: {
        id: "sub-2",
        cwd: "/Users/me/repo",
        source: { subagent: { thread_spawn: { parent_thread_id: "parent", depth: 1 } } },
      },
    });
    const mainThread = line({
      type: "session_meta",
      payload: { id: "main-1", cwd: "/Users/me/repo", thread_source: "user", source: "vscode" },
    });

    expect(parseCodexHead(byThreadSource)).toBeNull();
    expect(parseCodexHead(bySource)).toBeNull();
    expect(parseCodexHead(mainThread)).toMatchObject({ id: "main-1" });
  });
});

describe("parseSessionIndex", () => {
  it("maps session ids to thread names and updated times, skipping bad lines", () => {
    const raw = [
      line({ id: "a", thread_name: "새 모델 비용 계산", updated_at: "2026-07-12T07:24:12.902Z" }),
      line({ id: "b", updated_at: "2026-07-17T09:42:22.846Z" }),
      "not json",
      line({ thread_name: "id 없음" }),
    ].join("\n");

    const index = parseSessionIndex(raw);

    expect(index.get("a")).toEqual({
      title: "새 모델 비용 계산",
      updatedAt: Date.parse("2026-07-12T07:24:12.902Z"),
    });
    expect(index.get("b")).toEqual({
      title: "(제목 없음)",
      updatedAt: Date.parse("2026-07-17T09:42:22.846Z"),
    });
    expect(index.size).toBe(2);
  });
});

describe("parseLsofOpenPaths", () => {
  it("collects only the n-prefixed path lines", () => {
    const output = ["p33348", "f21", "n/a/open-1.jsonl", "f23", "n/a/open-2.jsonl", ""].join("\n");

    expect(parseLsofOpenPaths(output)).toEqual(new Set(["/a/open-1.jsonl", "/a/open-2.jsonl"]));
    expect(parseLsofOpenPaths("")).toEqual(new Set());
  });
});
