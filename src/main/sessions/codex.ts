import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { FileCache, TtlCache } from "./cache";
import { normalizePath } from "./encode";

const HEAD_BYTES = 128 * 1024;
const LSOF_TTL_MS = 45_000;

type CodexHead = Omit<CodexSession, "filePath" | "archived"> | null;

// 반복 스캔 비용 절감: rollout head와 session_index는 파일이 바뀌지 않으면 재파싱하지 않고,
// lsof는 대상 목록이 같으면 TTL 안에 다시 실행하지 않는다 (docs/plan/phase-6-auto-refresh.md).
const headCache = new FileCache<CodexHead>();
const indexCache = new FileCache<Map<string, CodexIndexEntry>>();
const openRolloutsCache = new TtlCache<Set<string>>(LSOF_TTL_MS);

export interface CodexSession {
  id: string;
  cwd: string;
  title: string;
  lastActivityAt: number | null;
  /** rollout 파일 경로 (실행 중 감지에 사용) */
  filePath: string;
  /** archived_sessions 디렉토리에 있는 세션 */
  archived: boolean;
}

/** session_index.jsonl 항목: 세션 제목과 최근 활동 */
export interface CodexIndexEntry {
  title: string;
  updatedAt: number | null;
}

export function codexDir(): string {
  return join(homedir(), ".codex");
}

/**
 * Codex 롤아웃 head(첫 줄들)에서 세션 메타와 제목을 뽑는다.
 * 첫 줄은 `session_meta`(cwd, id), 제목은 `<...>`로 시작하지 않는
 * 첫 user 메시지에서 유추한다. cwd/id 없으면 null.
 */
export function parseCodexHead(head: string): Omit<CodexSession, "filePath" | "archived"> | null {
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
      // 멀티 에이전트 모드의 서브 에이전트 스레드는 목록에서 제외한다.
      // (메인 세션은 thread_source가 "user", 서브는 "subagent" + source.subagent)
      if (isSubagentMeta(payload)) return null;
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

/** `~/.codex/session_index.jsonl`을 id → {제목, 최근 활동} 맵으로 파싱한다. */
export function parseSessionIndex(raw: string): Map<string, CodexIndexEntry> {
  const index = new Map<string, CodexIndexEntry>();
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (typeof data.id !== "string") continue;
    const title =
      typeof data.thread_name === "string" && data.thread_name ? data.thread_name : null;
    const updatedAt = parseTimestamp(data.updated_at);
    if (title || updatedAt !== null) {
      index.set(data.id, { title: title ?? "(제목 없음)", updatedAt });
    }
  }
  return index;
}

/**
 * `lsof -Fn -- <files>` 출력에서 열려 있는 파일 경로 집합을 뽑는다.
 * (열린 파일은 `n<경로>` 라인으로 나온다)
 */
export function parseLsofOpenPaths(output: string): Set<string> {
  const open = new Set<string>();
  for (const line of output.split("\n")) {
    if (line.startsWith("n")) open.add(line.slice(1));
  }
  return open;
}

/**
 * 주어진 rollout 파일 중 프로세스가 열어 둔(=세션 실행 중) 파일 집합을 반환한다.
 * lsof가 없거나 실패하면 빈 집합 (실행 중 표시만 빠질 뿐 동작에는 지장 없음).
 */
export function findOpenRollouts(paths: string[]): Promise<Set<string>> {
  if (paths.length === 0) return Promise.resolve(new Set());
  // 대상 목록이 같으면 TTL 안에는 재실행하지 않는다. 목록이 바뀌면(새 rollout 등장 등) 즉시 재실행.
  return openRolloutsCache.get(paths.join("\n"), () => runLsof(paths));
}

function runLsof(paths: string[]): Promise<Set<string>> {
  return new Promise((resolve) => {
    // 일부 파일만 열려 있으면 lsof가 exit 1을 반환하므로 stdout만 본다.
    execFile("lsof", ["-Fn", "--", ...paths], { maxBuffer: 4 * 1024 * 1024 }, (_error, stdout) => {
      resolve(parseLsofOpenPaths(stdout ?? ""));
    });
  });
}

/** 서브 에이전트 스레드인지 판정한다 (thread_source 또는 source.subagent) */
function isSubagentMeta(payload: Record<string, unknown>): boolean {
  if (payload.thread_source === "subagent") return true;
  const source = payload.source;
  return typeof source === "object" && source !== null && "subagent" in source;
}

/** `<태그>` 시스템 프리앰블을 건너뛰고 실제 첫 프롬프트를 찾는다. */
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

/**
 * Codex 세션 저장소(`sessions/` + `archived_sessions/`)를 훑어
 * cwd가 `cwds`에 속하는 세션만 반환한다. session_index의 제목·시간이 있으면 우선한다.
 */
export async function readCodexSessions(
  cwds: Set<string>,
  baseDir = codexDir(),
): Promise<CodexSession[]> {
  const index = await readSessionIndex(baseDir);

  const files: Array<{ path: string; archived: boolean }> = [
    ...(await walkRollouts(join(baseDir, "sessions"))).map((path) => ({ path, archived: false })),
    ...(await listRollouts(join(baseDir, "archived_sessions"))).map((path) => ({
      path,
      archived: true,
    })),
  ];

  const sessions: CodexSession[] = [];
  for (const file of files) {
    const head = await headCache.read(file.path, async () => {
      const buffer = await readFile(file.path);
      return parseCodexHead(buffer.subarray(0, HEAD_BYTES).toString("utf8"));
    });
    if (!head || !cwds.has(head.cwd)) continue;

    const indexed = index.get(head.id);
    sessions.push({
      ...head,
      title: indexed?.title ?? head.title,
      lastActivityAt: indexed?.updatedAt ?? head.lastActivityAt,
      filePath: file.path,
      archived: file.archived,
    });
  }
  headCache.retain(files.map((file) => file.path));
  return sessions;
}

async function readSessionIndex(baseDir: string): Promise<Map<string, CodexIndexEntry>> {
  const path = join(baseDir, "session_index.jsonl");
  const index = await indexCache.read(path, async () =>
    parseSessionIndex(await readFile(path, "utf8")),
  );
  return index ?? new Map();
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

/** 평평한 디렉토리의 rollout 파일 목록 (archived_sessions) */
async function listRollouts(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    return entries
      .filter((entry) => entry.startsWith("rollout-") && entry.endsWith(".jsonl"))
      .map((entry) => join(dir, entry));
  } catch {
    return [];
  }
}
