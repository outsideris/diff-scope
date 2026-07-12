import type { JSX } from "react";
import type { RepositoryEntry, Worktree } from "../../../shared/git";

export interface SidebarProps {
  repos: RepositoryEntry[];
  worktrees: Record<string, Worktree[]>;
  dirtyCounts: Record<string, number>;
  selectedDir: string | null;
  onSelect: (dir: string) => void;
  onAdd: () => void;
  onRemove: (repoPath: string) => void;
}

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

export function Sidebar({
  repos,
  worktrees,
  dirtyCounts,
  selectedDir,
  onSelect,
  onAdd,
  onRemove,
}: SidebarProps): JSX.Element {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">저장소</span>
        <button type="button" className="icon-button" title="저장소 추가" onClick={onAdd}>
          ＋
        </button>
      </div>
      <div className="sidebar-body">
        {repos.length === 0 && <div className="sidebar-empty">＋ 버튼으로 저장소를 추가하세요</div>}
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
                .map((worktree) => {
                  const dirty = dirtyCounts[worktree.path] ?? 0;
                  return (
                    <li key={worktree.path}>
                      <button
                        type="button"
                        className={`worktree-item${selectedDir === worktree.path ? " selected" : ""}`}
                        title={worktree.path}
                        onClick={() => onSelect(worktree.path)}
                      >
                        <BranchIcon />
                        <span className="name">{worktreeLabel(worktree)}</span>
                        {dirty > 0 && <span className="dirty">{dirty}</span>}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
