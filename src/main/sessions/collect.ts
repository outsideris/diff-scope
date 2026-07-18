import type { SessionInfo } from "../../shared/session";
import { readClaudeStore } from "./claudeStore";
import { findOpenRollouts, readCodexSessions } from "./codex";
import { normalizePath } from "./encode";
import { readRunningSessions } from "./running";
import { resolveState } from "./state";
import { listTranscriptIds, readTranscriptTitle } from "./transcripts";

/**
 * 주어진 워크트리 경로들에 연결된 모든 세션(Claude + Codex)을 수집한다.
 * cwd가 워크트리 경로와 정확히 일치하는 세션만 반환한다.
 */
export async function collectSessions(worktreePaths: string[]): Promise<SessionInfo[]> {
  const cwds = new Set(worktreePaths.map(normalizePath));
  if (cwds.size === 0) return [];

  const [metas, running, codex] = await Promise.all([
    readClaudeStore(cwds),
    readRunningSessions(),
    readCodexSessions(cwds),
  ]);

  const runningIds = new Set(running.map((session) => session.sessionId));

  // 워크트리별 전사 세션 ID 인덱스 (삭제 판정 + CLI-only 세션 발견)
  const transcriptIds = new Map<string, Set<string>>();
  await Promise.all(
    [...cwds].map(async (cwd) => {
      transcriptIds.set(cwd, new Set(await listTranscriptIds(cwd)));
    }),
  );
  const hasTranscript = (cwd: string, id: string): boolean =>
    transcriptIds.get(cwd)?.has(id) ?? false;

  const sessions = new Map<string, SessionInfo>();

  // 1) 데스크톱 메타를 가진 Claude 세션
  for (const meta of metas) {
    sessions.set(meta.cliSessionId, {
      id: meta.cliSessionId,
      app: "claude",
      title: meta.title,
      state: resolveState({
        isRunning: runningIds.has(meta.cliSessionId),
        hasTranscript: hasTranscript(meta.cwd, meta.cliSessionId),
        isArchived: meta.isArchived,
      }),
      cwd: meta.cwd,
      branch: meta.branch,
      lastActivityAt: meta.lastActivityAt,
    });
  }

  // 2) 메타 없는 CLI 전용 Claude 세션 (전사만 존재)
  for (const [cwd, ids] of transcriptIds) {
    for (const id of ids) {
      if (sessions.has(id)) continue;
      sessions.set(id, {
        id,
        app: "claude",
        title: (await readTranscriptTitle(cwd, id)) ?? "(제목 없음)",
        state: resolveState({
          isRunning: runningIds.has(id),
          hasTranscript: true,
          isArchived: false,
        }),
        cwd,
        branch: null,
        lastActivityAt: null,
      });
    }
  }

  // 3) Codex 세션 — 실행 중은 프로세스가 열어 둔 rollout 파일로 감지
  const openRollouts = await findOpenRollouts(
    codex.filter((session) => !session.archived).map((session) => session.filePath),
  );
  for (const session of codex) {
    if (sessions.has(session.id)) continue;
    sessions.set(session.id, {
      id: session.id,
      app: "codex",
      title: session.title,
      state: openRollouts.has(session.filePath)
        ? "running"
        : session.archived
          ? "archived"
          : "active",
      cwd: session.cwd,
      branch: null,
      lastActivityAt: session.lastActivityAt,
    });
  }

  return [...sessions.values()].sort(byRunningThenRecent);
}

function byRunningThenRecent(a: SessionInfo, b: SessionInfo): number {
  if (a.state === "running" && b.state !== "running") return -1;
  if (b.state === "running" && a.state !== "running") return 1;
  return (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0);
}
