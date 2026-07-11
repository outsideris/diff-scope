import type { JSX } from "react";
import type { RepositoryEntry, Worktree } from "../../../shared/git";

export interface SidebarProps {
  repos: RepositoryEntry[];
  worktrees: Record<string, Worktree[]>;
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

export function Sidebar({
  repos,
  worktrees,
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
          +
        </button>
      </div>
      <div className="sidebar-body">
        {repos.length === 0 && <div className="sidebar-empty">+ 버튼으로 저장소를 추가하세요</div>}
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
                  <li key={worktree.path}>
                    <button
                      type="button"
                      className={`worktree-item${selectedDir === worktree.path ? " selected" : ""}`}
                      title={worktree.path}
                      onClick={() => onSelect(worktree.path)}
                    >
                      {worktreeLabel(worktree)}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
