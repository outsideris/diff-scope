import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { FileCache } from "./cache";
import { encodeProjectDir } from "./encode";

const HEAD_BYTES = 256 * 1024;

export function projectsDir(): string {
  return join(homedir(), ".claude", "projects");
}

/**
 * 전사 jsonl의 앞부분에서 첫 사용자 텍스트 메시지를 찾아 제목으로 만든다.
 * 못 찾으면 null.
 */
export function deriveTitle(head: string): string | null {
  for (const line of head.split("\n")) {
    if (!line.trim()) continue;
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (data.type !== "user") continue;
    const message = data.message as { content?: unknown } | undefined;
    const text = extractText(message?.content);
    if (text) return firstLine(text);
  }
  return null;
}

function extractText(content: unknown): string | null {
  if (typeof content === "string") return content.trim() || null;
  if (Array.isArray(content)) {
    for (const block of content) {
      if (
        block &&
        typeof block === "object" &&
        (block as { type?: unknown }).type === "text" &&
        typeof (block as { text?: unknown }).text === "string"
      ) {
        const text = ((block as { text: string }).text ?? "").trim();
        if (text) return text;
      }
    }
  }
  return null;
}

function firstLine(text: string): string {
  const line = text.split("\n").find((l) => l.trim().length > 0) ?? text;
  return line.trim().slice(0, 80);
}

/** 워크트리 경로에 해당하는 프로젝트 디렉토리의 전사 세션 ID 목록을 반환한다. */
export async function listTranscriptIds(cwd: string, dir = projectsDir()): Promise<string[]> {
  const encoded = encodeProjectDir(cwd);
  let entries: string[];
  try {
    entries = await readdir(join(dir, encoded));
  } catch {
    return [];
  }
  return entries.filter((e) => e.endsWith(".jsonl")).map((e) => e.slice(0, -".jsonl".length));
}

// 제목은 첫 사용자 메시지에서 나와 사실상 불변이지만, append로 mtime이 바뀌면
// 다시 유추한다(결과 동일). 항목 수는 실제 전사 파일 수에 유계라 retain은 생략한다.
const titleCache = new FileCache<string | null>();

/** 전사 파일 head를 읽어 제목을 유추한다. 없으면 null. */
export async function readTranscriptTitle(
  cwd: string,
  sessionId: string,
  dir = projectsDir(),
): Promise<string | null> {
  const path = join(dir, encodeProjectDir(cwd), `${sessionId}.jsonl`);
  return titleCache.read(path, async () => {
    const buffer = await readFile(path);
    return deriveTitle(buffer.subarray(0, HEAD_BYTES).toString("utf8"));
  });
}
