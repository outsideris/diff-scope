import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { FileCache } from "./cache";
import { normalizePath } from "./encode";

export interface ClaudeMeta {
  /** CLI 세션 ID (전사 파일명) */
  cliSessionId: string;
  cwd: string;
  branch: string | null;
  title: string;
  isArchived: boolean;
  lastActivityAt: number | null;
}

export function claudeStoreDir(): string {
  return join(homedir(), "Library", "Application Support", "Claude", "claude-code-sessions");
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

function toBool(value: unknown): boolean {
  return value === true || value === "true" || value === "True";
}

/** 데스크톱 세션 메타(`local_<id>.json`) 한 개를 파싱한다. */
export function parseClaudeMeta(raw: string): ClaudeMeta | null {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  const cliSessionId = data.cliSessionId;
  if (typeof cliSessionId !== "string" || cliSessionId.length === 0) return null;

  const cwd = typeof data.cwd === "string" ? data.cwd : "";
  const branch = typeof data.branch === "string" && data.branch.length > 0 ? data.branch : null;
  const title =
    typeof data.title === "string" && data.title.length > 0 ? data.title : "(제목 없음)";

  return {
    cliSessionId,
    cwd: normalizePath(cwd),
    branch,
    title,
    isArchived: toBool(data.isArchived),
    lastActivityAt: toNumber(data.lastActivityAt) ?? toNumber(data.createdAt),
  };
}

/**
 * 데스크톱 세션 저장소를 훑어 cwd가 `cwds` 집합에 속하는 메타만 반환한다.
 * 저장소는 `<store>/<workspace>/<project>/local_*.json` 2단계 구조다.
 */
// cwd 필터와 무관하게 파싱 결과를 캐시해, 워크트리 목록이 바뀌어도 캐시가 유효하다.
const metaCache = new FileCache<ClaudeMeta | null>();

export async function readClaudeStore(
  cwds: Set<string>,
  dir = claudeStoreDir(),
): Promise<ClaudeMeta[]> {
  const files = await walkLocalFiles(dir);
  const metas: ClaudeMeta[] = [];
  for (const file of files) {
    const meta = await metaCache.read(file, async () =>
      parseClaudeMeta(await readFile(file, "utf8")),
    );
    if (meta && cwds.has(meta.cwd)) metas.push(meta);
  }
  metaCache.retain(files);
  return metas;
}

async function walkLocalFiles(dir: string): Promise<string[]> {
  let workspaces: string[];
  try {
    workspaces = await readdir(dir);
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const ws of workspaces) {
    let projects: string[];
    try {
      projects = await readdir(join(dir, ws));
    } catch {
      continue;
    }
    for (const proj of projects) {
      let entries: string[];
      try {
        entries = await readdir(join(dir, ws, proj));
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (entry.startsWith("local_") && entry.endsWith(".json")) {
          files.push(join(dir, ws, proj, entry));
        }
      }
    }
  }
  return files;
}
