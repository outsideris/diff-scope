import type { JSX } from "react";
import type { SessionApp, SessionInfo } from "../../../shared/session";
import { relativeDate } from "../lib/format";
import { isDimmed, stateLabel } from "../lib/session";

function AppIcon({ app }: { app: SessionApp }): JSX.Element {
  // 앱 구분 마커 (액센트와 별개인 브랜드 색상)
  if (app === "codex") {
    return (
      <span className="session-app app-codex" title="Codex">
        <svg
          width="11"
          height="11"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <circle cx="8" cy="8" r="5.5" />
        </svg>
      </span>
    );
  }
  return (
    <span className="session-app app-claude" title="Claude Code">
      <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1.5l1.6 4.9H14l-3.7 2.7 1.4 4.9L8 11l-3.7 3 1.4-4.9L2 6.4h4.4z" />
      </svg>
    </span>
  );
}

export function SessionList({ sessions }: { sessions: SessionInfo[] }): JSX.Element {
  return (
    <ul className="session-list">
      {sessions.map((session) => (
        <li key={`${session.app}:${session.id}`}>
          <div
            className={`session-item state-${session.state}${isDimmed(session.state) ? " dimmed" : ""}`}
            title={`${stateLabel(session.state)} · ${session.title}`}
          >
            <AppIcon app={session.app} />
            {session.state === "running" && <span className="session-dot" aria-hidden="true" />}
            <span className="session-title">{session.title}</span>
            <span className="session-meta">
              {session.state === "running" ? (
                <span className="session-badge running">실행 중</span>
              ) : session.state === "archived" ? (
                <span className="session-badge archived">아카이브</span>
              ) : session.state === "deleted" ? (
                <span className="session-badge deleted">삭제됨</span>
              ) : session.lastActivityAt ? (
                <span className="session-time">
                  {relativeDate(new Date(session.lastActivityAt).toISOString())}
                </span>
              ) : null}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
