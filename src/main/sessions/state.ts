import type { SessionState } from "../../shared/session";

export interface StateInput {
  isRunning: boolean;
  hasTranscript: boolean;
  isArchived: boolean;
}

/** 세션 상태를 우선순위 running > deleted > archived > active 로 판정한다. */
export function resolveState({ isRunning, hasTranscript, isArchived }: StateInput): SessionState {
  if (isRunning) return "running";
  if (!hasTranscript) return "deleted";
  if (isArchived) return "archived";
  return "active";
}
