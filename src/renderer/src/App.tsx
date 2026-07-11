import { type JSX, useCallback, useEffect, useState } from "react";
import type { RepositoryEntry, Worktree } from "../../shared/git";
import { HistoryView } from "./components/HistoryView";
import { Sidebar } from "./components/Sidebar";
import { WorkingView } from "./components/WorkingView";

type ViewKind = "working" | "history";

export function App(): JSX.Element {
  const [repos, setRepos] = useState<RepositoryEntry[]>([]);
  const [worktrees, setWorktrees] = useState<Record<string, Worktree[]>>({});
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

  return (
    <div className="app">
      <Sidebar
        repos={repos}
        worktrees={worktrees}
        selectedDir={selectedDir}
        onSelect={setSelectedDir}
        onAdd={addRepository}
        onRemove={removeRepository}
      />
      <main className="content">
        <header className="toolbar">
          <div className="location" title={selectedDir ?? ""}>
            {selectedDir ?? "저장소를 선택하세요"}
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
