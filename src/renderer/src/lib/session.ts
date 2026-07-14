import type { SessionInfo, SessionState } from "../../../shared/session";

/** 세션을 cwd(워크트리 경로)별로 묶는다. 경로 끝 슬래시는 무시한다. */
export function groupSessionsByDir(sessions: SessionInfo[]): Record<string, SessionInfo[]> {
  const groups: Record<string, SessionInfo[]> = {};
  for (const session of sessions) {
    const key = session.cwd.replace(/\/+$/, "");
    (groups[key] ??= []).push(session);
  }
  return groups;
}

export interface SessionCounts {
  total: number;
  running: number;
  live: number; // running + active (아카이브/삭제 제외)
}

export function countSessions(sessions: SessionInfo[]): SessionCounts {
  let running = 0;
  let live = 0;
  for (const session of sessions) {
    if (session.state === "running") running++;
    if (session.state === "running" || session.state === "active") live++;
  }
  return { total: sessions.length, running, live };
}

const STATE_LABEL: Record<SessionState, string> = {
  running: "실행 중",
  active: "활성",
  archived: "아카이브",
  deleted: "삭제됨",
};

export function stateLabel(state: SessionState): string {
  return STATE_LABEL[state];
}

/** 아카이브/삭제 세션인지 (기본 접힘 대상) */
export function isDimmed(state: SessionState): boolean {
  return state === "archived" || state === "deleted";
}
