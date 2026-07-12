import { type JSX, useCallback, useEffect, useState } from "react";
import type { RepositoryEntry, Worktree } from "../../shared/git";
import { HistoryView } from "./components/HistoryView";
import { Sidebar } from "./components/Sidebar";
import { WorkingView } from "./components/WorkingView";
import { shortenPath } from "./lib/format";

type ViewKind = "working" | "history";

const SIDEBAR_COLLAPSED_KEY = "diff-scope:sidebar-collapsed";

export function App(): JSX.Element {
  const [repos, setRepos] = useState<RepositoryEntry[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true",
  );
  const [worktrees, setWorktrees] = useState<Record<string, Worktree[]>>({});
  const [dirtyCounts, setDirtyCounts] = useState<Record<string, number>>({});
  const [selectedDir, setSelectedDir] = useState<string | null>(null);
  const [view, setView] = useState<ViewKind>("working");
  const [error, setError] = useState<string | null>(null);

  const loadWorktrees = useCallback(async (entries: RepositoryEntry[]) => {
    const results = await Promise.all(
      entries.map(async (repo) => {
        try {
          return [repo.path, await window.diffScope.listWorktrees(repo.path)] as const;
        } catch {
          // 사라진 저장소 등은 자기 자신만 보여준다.
          return [
            repo.path,
            [
              {
                path: repo.path,
                head: null,
                branch: null,
                detached: false,
                bare: false,
                locked: false,
              },
            ],
          ] as const;
        }
      }),
    );
    setWorktrees(Object.fromEntries(results));

    const dirs = results.flatMap(([, list]) => list.filter((w) => !w.bare).map((w) => w.path));
    const counts = await Promise.all(
      dirs.map(async (dir) => {
        try {
          const status = await window.diffScope.getStatus(dir);
          return [dir, status.entries.length] as const;
        } catch {
          return [dir, 0] as const;
        }
      }),
    );
    setDirtyCounts(Object.fromEntries(counts));
  }, []);

  const refreshRepos = useCallback(
    async (entries?: RepositoryEntry[]) => {
      try {
        const list = entries ?? (await window.diffScope.listRepositories());
        setRepos(list);
        await loadWorktrees(list);
        setError(null);
        return list;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return [];
      }
    },
    [loadWorktrees],
  );

  useEffect(() => {
    refreshRepos().then((list) => {
      if (list.length > 0) setSelectedDir((prev) => prev ?? list[0].path);
    });
  }, [refreshRepos]);

  const addRepository = useCallback(async () => {
    try {
      const dir = await window.diffScope.selectDirectory();
      if (!dir) return;
      const list = await window.diffScope.addRepository(dir);
      await refreshRepos(list);
      const added = list.find((repo) => dir.startsWith(repo.path)) ?? list[list.length - 1];
      if (added) setSelectedDir(added.path);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [refreshRepos]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(!prev));
      return !prev;
    });
  }, []);

  const removeRepository = useCallback(
    async (repoPath: string) => {
      const list = await window.diffScope.removeRepository(repoPath);
      await refreshRepos(list);
      setSelectedDir((prev) => {
        if (prev !== null && (prev === repoPath || prev.startsWith(`${repoPath}/`))) {
          return list[0]?.path ?? null;
        }
        return prev;
      });
    },
    [refreshRepos],
  );

  const selectedWorktree =
    selectedDir === null
      ? null
      : (Object.values(worktrees)
          .flat()
          .find((worktree) => worktree.path === selectedDir) ?? null);
  const location = selectedDir === null ? null : shortenPath(selectedDir);
  const branchLabel = selectedWorktree
    ? (selectedWorktree.branch ??
      (selectedWorktree.detached ? `detached ${selectedWorktree.head?.slice(0, 7) ?? ""}` : null))
    : null;

  return (
    <div className="app">
      <Sidebar
        repos={repos}
        worktrees={worktrees}
        dirtyCounts={dirtyCounts}
        selectedDir={selectedDir}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
        onSelect={setSelectedDir}
        onAdd={addRepository}
        onRemove={removeRepository}
      />
      <main className="content">
        <header className="toolbar">
          <div className="location" title={selectedDir ?? ""}>
            {location ? (
              <>
                <span className="path">
                  {location.prefix}
                  <b>{location.base}</b>
                </span>
                {branchLabel && <span className="chip">{branchLabel}</span>}
              </>
            ) : (
              <span className="path">저장소를 선택하세요</span>
            )}
          </div>
          <div className="segmented">
            <button
              type="button"
              className={view === "working" ? "active" : ""}
              onClick={() => setView("working")}
            >
              Working
            </button>
            <button
              type="button"
              className={view === "history" ? "active" : ""}
              onClick={() => setView("history")}
            >
              History
            </button>
          </div>
        </header>
        {error && <div className="error-note">{error}</div>}
        {selectedDir === null ? (
          <div className="placeholder">
            <p>왼쪽에서 저장소를 추가하고 워크트리를 선택하세요.</p>
          </div>
        ) : view === "working" ? (
          <WorkingView dir={selectedDir} />
        ) : (
          <HistoryView dir={selectedDir} />
        )}
      </main>
    </div>
  );
}
