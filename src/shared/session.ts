export type SessionApp = "claude" | "codex";

/**
 * 세션 상태. 우선순위 running > deleted > archived > active 로 판정한다.
 * - running: 현재 실행 중인 프로세스가 있음
 * - deleted: 세션 메타는 있으나 전사(대화 기록)가 삭제됨
 * - archived: 사용자가 아카이브함
 * - active: 일반 (전사 존재, 미아카이브, 미실행)
 */
export type SessionState = "running" | "active" | "archived" | "deleted";

export interface SessionInfo {
  /** CLI 세션 ID (전사 파일명, resume 시 사용) */
  id: string;
  app: SessionApp;
  title: string;
  state: SessionState;
  /** 세션의 작업 디렉토리 (워크트리 경로와 매칭) */
  cwd: string;
  branch: string | null;
  /** 마지막 활동 시각 (epoch ms). 알 수 없으면 null */
  lastActivityAt: number | null;
}
