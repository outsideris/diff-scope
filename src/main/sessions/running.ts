import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export interface RunningSession {
  sessionId: string;
  cwd: string;
  pid: number;
  entrypoint: string | null;
}

export function runningSessionsDir(): string {
  return join(homedir(), ".claude", "sessions");
}

/** `~/.claude/sessions/<pid>.json` 한 개를 파싱한다. 필수 필드 없으면 null. */
export function parseRunningSession(raw: string): Omit<RunningSession, never> | null {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (typeof data.sessionId !== "string" || typeof data.pid !== "number") return null;
  return {
    sessionId: data.sessionId,
    pid: data.pid,
    cwd: typeof data.cwd === "string" ? data.cwd : "",
    entrypoint: typeof data.entrypoint === "string" ? data.entrypoint : null,
  };
}

/** PID가 살아있는지 확인한다 (신호 0). 권한 오류(EPERM)도 생존으로 본다. */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

export async function readRunningSessions(
  dir = runningSessionsDir(),
  alive = isProcessAlive,
): Promise<RunningSession[]> {
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }

  const sessions: RunningSession[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    let parsed: RunningSession | null;
    try {
      parsed = parseRunningSession(await readFile(join(dir, file), "utf8"));
    } catch {
      continue;
    }
    if (parsed && alive(parsed.pid)) sessions.push(parsed);
  }
  return sessions;
}
