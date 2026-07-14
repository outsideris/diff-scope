import { type JSX, useCallback, useState } from "react";
import type { RepositoryEntry, Worktree } from "../../../shared/git";
import type { SessionInfo } from "../../../shared/session";
import { countSessions, isDimmed } from "../lib/session";
import { SessionList } from "./SessionList";

export interface SidebarProps {
  repos: RepositoryEntry[];
  worktrees: Record<string, Worktree[]>;
  dirtyCounts: Record<string, number>;
  sessionsByDir: Record<string, SessionInfo[]>;
  selectedDir: string | null;
  collapsed: boolean;
  showArchived: boolean;
  onToggleCollapsed: () => void;
  onToggleArchived: () => void;
  onSelect: (dir: string) => void;
  onAdd: () => void;
  onRemove: (repoPath: string) => void;
}

const EXPANDED_KEY = "diff-scope:expanded-worktrees";

function worktreeLabel(worktree: Worktree): string {
  if (worktree.branch) return worktree.branch;
  if (worktree.detached) return `(detached ${worktree.head?.slice(0, 7) ?? ""})`;
  return worktree.path.split("/").pop() ?? worktree.path;
}

function BranchIcon(): JSX.Element {
  return (
    <svg className="branch-ico" width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
      <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Z" />
    </svg>
  );
}

function PanelIcon(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" />
      <line x1="5.75" y1="2.5" x2="5.75" y2="13.5" />
    </svg>
  );
}

function Worktree({
  worktree,
  dirty,
  sessions,
  selected,
  expanded,
  showArchived,
  onSelect,
  onToggleExpand,
}: {
  worktree: Worktree;
  dirty: number;
  sessions: SessionInfo[];
  selected: boolean;
  expanded: boolean;
  showArchived: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
}): JSX.Element {
  const counts = countSessions(sessions);
  const hasSessions = counts.total > 0;
  const hiddenCount = counts.total - counts.live;
  const visible = showArchived ? sessions : sessions.filter((s) => !isDimmed(s.state));

  return (
    <li className="worktree-entry">
      <div className="worktree-row">
        <button
          type="button"
          className={`disclosure${hasSessions ? "" : " empty"}`}
          aria-label={expanded ? "세션 접기" : "세션 펼치기"}
          aria-expanded={expanded}
          onClick={onToggleExpand}
          disabled={!hasSessions}
        >
          {hasSessions ? (expanded ? "▾" : "▸") : ""}
        </button>
        <button
          type="button"
          className={`worktree-item${selected ? " selected" : ""}`}
          title={worktree.path}
          onClick={onSelect}
        >
          <BranchIcon />
          <span className="name">{worktreeLabel(worktree)}</span>
          {counts.running > 0 && <span className="running-dot" title="실행 중인 세션" />}
          {counts.total > 0 && <span className="session-count">{counts.total}</span>}
          {dirty > 0 && <span className="dirty">{dirty}</span>}
        </button>
      </div>
      {expanded && hasSessions && (
        <>
          <SessionList sessions={visible} />
          {!showArchived && hiddenCount > 0 && (
            <div className="session-hidden-note">아카이브·삭제 {hiddenCount}개 숨김</div>
          )}
        </>
      )}
    </li>
  );
}

export function Sidebar({
  repos,
  worktrees,
  dirtyCounts,
  sessionsByDir,
  selectedDir,
  collapsed,
  showArchived,
  onToggleCollapsed,
  onToggleArchived,
  onSelect,
  onAdd,
  onRemove,
}: SidebarProps): JSX.Element {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(EXPANDED_KEY) ?? "[]") as string[]);
    } catch {
      return new Set();
    }
  });

  const toggleExpand = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      localStorage.setItem(EXPANDED_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      {!collapsed && (
        <>
          <div className="sidebar-header">
            <span className="sidebar-title">저장소</span>
            <div className="sidebar-header-actions">
              <button
                type="button"
                className={`icon-button small${showArchived ? " active" : ""}`}
                title={showArchived ? "아카이브·삭제 세션 숨기기" : "아카이브·삭제 세션 표시"}
                aria-pressed={showArchived}
                onClick={onToggleArchived}
              >
                🗄
              </button>
              <button type="button" className="icon-button" title="저장소 추가" onClick={onAdd}>
                ＋
              </button>
            </div>
          </div>
          <div className="sidebar-body">
            {repos.length === 0 && (
              <div className="sidebar-empty">＋ 버튼으로 저장소를 추가하세요</div>
            )}
            {repos.map((repo) => (
              <div className="repo-group" key={repo.path}>
                <div className="repo-name" title={repo.path}>
                  <span>{repo.name}</span>
                  <button
                    type="button"
                    className="icon-button subtle"
                    title="목록에서 제거"
                    onClick={() => onRemove(repo.path)}
                  >
                    ×
                  </button>
                </div>
                <ul className="worktree-list">
                  {(worktrees[repo.path] ?? [])
                    .filter((worktree) => !worktree.bare)
                    .map((worktree) => (
                      <Worktree
                        key={worktree.path}
                        worktree={worktree}
                        dirty={dirtyCounts[worktree.path] ?? 0}
                        sessions={sessionsByDir[worktree.path] ?? []}
                        selected={selectedDir === worktree.path}
                        expanded={expanded.has(worktree.path)}
                        showArchived={showArchived}
                        onSelect={() => onSelect(worktree.path)}
                        onToggleExpand={() => toggleExpand(worktree.path)}
                      />
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="sidebar-footer">
        <button
          type="button"
          className="icon-button"
          title={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          aria-expanded={!collapsed}
          onClick={onToggleCollapsed}
        >
          <PanelIcon />
        </button>
      </div>
    </aside>
  );
}
