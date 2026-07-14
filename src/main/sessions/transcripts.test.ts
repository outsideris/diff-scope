import { describe, expect, it } from "vitest";
import { deriveTitle } from "./transcripts";

function line(obj: unknown): string {
  return JSON.stringify(obj);
}

describe("deriveTitle", () => {
  it("uses the first user text message, first non-empty line, trimmed", () => {
    const head = [
      line({ type: "queue-operation" }),
      line({
        type: "user",
        message: {
          role: "user",
          content: [{ type: "text", text: "  \n첫 요청입니다\n추가 설명" }],
        },
      }),
    ].join("\n");

    expect(deriveTitle(head)).toBe("첫 요청입니다");
  });

  it("handles string content", () => {
    const head = line({ type: "user", message: { content: "간단한 요청" } });
    expect(deriveTitle(head)).toBe("간단한 요청");
  });

  it("skips tool-result user messages without text and returns null when none found", () => {
    const head = [
      line({ type: "user", message: { content: [{ type: "tool_result", content: "x" }] } }),
      line({ type: "assistant", message: { content: [{ type: "text", text: "답변" }] } }),
    ].join("\n");

    expect(deriveTitle(head)).toBeNull();
    expect(deriveTitle("")).toBeNull();
  });
});
