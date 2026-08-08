import { type JSX, useEffect, useMemo, useState } from "react";
import {
  type DiffRevisions,
  INDEX_REV,
  type NumstatEntry,
  type RepoStatus,
} from "../../../shared/git";
import type { SessionInfo } from "../../../shared/session";
import { splitPath } from "../lib/format";
import { isDimmed } from "../lib/session";
import { groupStatusEntries, type WorkingFile } from "../lib/status";
import { useAsync } from "../lib/useAsync";
import { DiffPane } from "./DiffPane";
import { SessionList } from "./SessionList";

interface Selection {
  path: string;
  staged: boolean;
  untracked: boolean;
}

interface WorkingData {
  status: RepoStatus;
  unstagedStats: NumstatEntry[];
  stagedStats: NumstatEntry[];
}

function selectionFor(file: WorkingFile, staged: boolean): Selection {
  return { path: file.path, staged, untracked: file.untracked };
}

function statsMap(entries: NumstatEntry[]): Map<string, NumstatEntry> {
  return new Map(entries.map((entry) => [entry.path, entry]));
}

function Delta({ stat }: { stat: NumstatEntry | undefined }): JSX.Element | null {
  if (!stat || (stat.added === null && stat.deleted === null)) return null;
  return (
    <span className="delta">
      {stat.added !== null && stat.added > 0 && <span className="p">+{stat.added}</span>}{" "}
      {stat.deleted !== null && stat.deleted > 0 && <span className="m">−{stat.deleted}</span>}
    </span>
  );
}

function FileList({
  title,
  files,
  staged,
  stats,
  selection,
  onSelect,
}: {
  title: string;
  files: WorkingFile[];
  staged: boolean;
  stats: Map<string, NumstatEntry>;
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
}): JSX.Element {
  return (
    <div className="file-section">
      <div className="file-section-title">
        {title} <span className="count">{files.length}</span>
      </div>
      {files.length === 0 && <div className="file-section-empty">없음</div>}
      <ul className="file-list">
        {files.map((file) => {
          const selected =
            selection !== null && selection.staged === staged && selection.path === file.path;
          const { dir, name } = splitPath(file.path);
          return (
            <li key={`${file.path}:${file.code}`}>
              <button
                type="button"
                className={`file-item${selected ? " selected" : ""}`}
                title={file.origPath ? `${file.origPath} → ${file.path}` : file.path}
                onClick={() => onSelect(selectionFor(file, staged))}
              >
                <span className={`status-code code-${file.code === "?" ? "untracked" : file.code}`}>
                  {file.code === "?" ? "U" : file.code}
                </span>
                <span className="file-path">
                  <span className="dir">{dir}</span>
                  <span className="fname">{name}</span>
                </span>
                <Delta stat={stats.get(file.path)} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function WorkingView({
  dir,
  sessions,
  showArchived,
}: {
  dir: string;
  sessions: SessionInfo[];
  showArchived: boolean;
}): JSX.Element {
  const working = useAsync<WorkingData>(async () => {
    const [status, unstagedStats, stagedStats] = await Promise.all([
      window.diffScope.getStatus(dir),
      window.diffScope.getWorkingNumstat(dir),
      window.diffScope.getWorkingNumstat(dir, { staged: true }),
    ]);
    return { status, unstagedStats, stagedStats };
  }, [dir]);
  const [selection, setSelection] = useState<Selection | null>(null);

  const grouped = useMemo(
    () => (working.data ? groupStatusEntries(working.data.status) : { staged: [], unstaged: [] }),
    [working.data],
  );
  const unstagedStats = useMemo(() => statsMap(working.data?.unstagedStats ?? []), [working.data]);
  const stagedStats = useMemo(() => statsMap(working.data?.stagedStats ?? []), [working.data]);

  // 디렉토리가 바뀌거나 목록에서 사라진 파일이 선택되어 있으면 선택을 보정한다.
  useEffect(() => {
    setSelection(null);
  }, [dir]);

  useEffect(() => {
    if (working.data === null) return;
    const stillThere =
      selection !== null &&
      (selection.staged ? grouped.staged : grouped.unstaged).some(
        (file) => file.path === selection.path,
      );
    if (!stillThere) {
      const first = grouped.unstaged[0] ?? grouped.staged[0] ?? null;
      setSelection(first ? selectionFor(first, first === grouped.staged[0]) : null);
    }
  }, [working.data, grouped, selection]);

  const diff = useAsync(async () => {
    if (!selection) return "";
    return window.diffScope.getWorkingDiff(dir, {
      path: selection.path,
      staged: selection.staged,
      untracked: selection.untracked,
    });
  }, [dir, selection]);

  // staged diff는 HEAD↔인덱스, unstaged diff는 인덱스↔워킹 트리를 비교한 것이다.
  const revisions = useMemo<DiffRevisions>(
    () =>
      selection?.staged
        ? { oldRev: "HEAD", newRev: INDEX_REV }
        : { oldRev: INDEX_REV, newRev: null },
    [selection?.staged],
  );

  const visibleSessions = showArchived ? sessions : sessions.filter((s) => !isDimmed(s.state));
  const hiddenSessionCount = sessions.length - visibleSessions.length;

  const status = working.data?.status ?? null;
  const branchInfo = status
    ? `${status.detached ? "detached HEAD" : (status.branch ?? "?")}` +
      (status.ahead !== null ? ` ↑${status.ahead} ↓${status.behind}` : "")
    : "";

  return (
    <div className="view">
      <section className="list-pane">
        <div className="list-pane-header">
          <span className="branch-info" title={branchInfo}>
            {branchInfo}
          </span>
          <button type="button" className="icon-button" title="새로고침" onClick={working.reload}>
            ⟳
          </button>
        </div>
        {working.error && <div className="error-note">{working.error}</div>}
        <FileList
          title="Staged"
          files={grouped.staged}
          staged={true}
          stats={stagedStats}
          selection={selection}
          onSelect={setSelection}
        />
        <FileList
          title="Changes"
          files={grouped.unstaged}
          staged={false}
          stats={unstagedStats}
          selection={selection}
          onSelect={setSelection}
        />
        <div className="file-section session-section">
          <div className="file-section-title">
            Sessions <span className="count">{sessions.length}</span>
          </div>
          {visibleSessions.length === 0 && <div className="file-section-empty">없음</div>}
          {visibleSessions.length > 0 && <SessionList sessions={visibleSessions} />}
          {!showArchived && hiddenSessionCount > 0 && (
            <div className="session-hidden-note">아카이브·삭제 {hiddenSessionCount}개 숨김</div>
          )}
        </div>
      </section>
      {diff.error ? (
        <div className="diff-pane empty">{diff.error}</div>
      ) : (
        <DiffPane
          diff={diff.data ?? ""}
          dir={dir}
          revisions={revisions}
          emptyMessage={
            status && grouped.staged.length + grouped.unstaged.length === 0
              ? "변경사항이 없습니다"
              : "파일을 선택하세요"
          }
        />
      )}
    </div>
  );
}
