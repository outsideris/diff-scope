import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { normalizePath } from "./encode";

const HEAD_BYTES = 128 * 1024;

export interface CodexSession {
  id: string;
  cwd: string;
  title: string;
  lastActivityAt: number | null;
}

export function codexSessionsDir(): string {
  return join(homedir(), ".codex", "sessions");
}

/**
 * Codex 롤아웃 head(첫 줄들)에서 세션 메타와 제목을 뽑는다.
 * 첫 줄은 `session_meta`(cwd, id), 제목은 `<...>`로 시작하지 않는
 * 첫 user 메시지에서 유추한다. cwd/id 없으면 null.
 */
export function parseCodexHead(head: string): CodexSession | null {
  const lines = head.split("\n");
  let meta: { id: string; cwd: string; ts: number | null } | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    const payload = data.payload as Record<string, unknown> | undefined;
    if (!payload) continue;

    if (!meta && data.type === "session_meta") {
      if (typeof payload.id !== "string" || typeof payload.cwd !== "string") return null;
      meta = {
        id: payload.id,
        cwd: normalizePath(payload.cwd),
        ts: parseTimestamp(data.timestamp),
      };
      continue;
    }

    if (meta && payload.type === "message" && payload.role === "user") {
      const text = firstUserText(payload.content);
      if (text) return { id: meta.id, cwd: meta.cwd, title: text, lastActivityAt: meta.ts };
    }
  }

  if (meta) return { id: meta.id, cwd: meta.cwd, title: "(제목 없음)", lastActivityAt: meta.ts };
  return null;
}

/** `<recommended_plugins>` 같은 시스템 프리앰블을 건너뛰고 실제 첫 프롬프트를 찾는다. */
function firstUserText(content: unknown): string | null {
  if (!Array.isArray(content)) return null;
  for (const block of content) {
    if (
      block &&
      typeof block === "object" &&
      ((block as { type?: unknown }).type === "input_text" ||
        (block as { type?: unknown }).type === "text") &&
      typeof (block as { text?: unknown }).text === "string"
    ) {
      const text = ((block as { text: string }).text ?? "").trim();
      if (text && !text.startsWith("<")) {
        const line = text.split("\n").find((l) => l.trim().length > 0) ?? text;
        return line.trim().slice(0, 80);
      }
    }
  }
  return null;
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/** Codex 세션 저장소를 훑어 cwd가 `cwds`에 속하는 세션만 반환한다. */
export async function readCodexSessions(
  cwds: Set<string>,
  dir = codexSessionsDir(),
): Promise<CodexSession[]> {
  const sessions: CodexSession[] = [];
  for (const file of await walkRollouts(dir)) {
    let session: CodexSession | null;
    try {
      const buffer = await readFile(file);
      session = parseCodexHead(buffer.subarray(0, HEAD_BYTES).toString("utf8"));
    } catch {
      continue;
    }
    if (session && cwds.has(session.cwd)) sessions.push(session);
  }
  return sessions;
}

/** `<dir>/YYYY/MM/DD/rollout-*.jsonl`을 모두 찾는다. */
async function walkRollouts(dir: string): Promise<string[]> {
  const files: string[] = [];
  await collect(dir, 0);
  return files;

  async function collect(current: string, depth: number): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(current);
    } catch {
      return;
    }
    if (depth >= 3) {
      for (const entry of entries) {
        if (entry.startsWith("rollout-") && entry.endsWith(".jsonl")) {
          files.push(join(current, entry));
        }
      }
      return;
    }
    for (const entry of entries) {
      await collect(join(current, entry), depth + 1);
    }
  }
}
