import { type JSX, useEffect, useMemo, useState } from "react";
import { groupStatusEntries, type WorkingFile } from "../lib/status";
import { useAsync } from "../lib/useAsync";
import { DiffPane } from "./DiffPane";

interface Selection {
  path: string;
  staged: boolean;
  untracked: boolean;
}

function selectionFor(file: WorkingFile, staged: boolean): Selection {
  return { path: file.path, staged, untracked: file.untracked };
}

function FileList({
  title,
  files,
  staged,
  selection,
  onSelect,
}: {
  title: string;
  files: WorkingFile[];
  staged: boolean;
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
                <span className="file-path">{file.path}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function WorkingView({ dir }: { dir: string }): JSX.Element {
  const status = useAsync(() => window.diffScope.getStatus(dir), [dir]);
  const [selection, setSelection] = useState<Selection | null>(null);

  const grouped = useMemo(
    () => (status.data ? groupStatusEntries(status.data) : { staged: [], unstaged: [] }),
    [status.data],
  );

  // 디렉토리가 바뀌거나 목록에서 사라진 파일이 선택되어 있으면 선택을 보정한다.
  useEffect(() => {
    setSelection(null);
  }, [dir]);

  useEffect(() => {
    if (status.data === null) return;
    const stillThere =
      selection !== null &&
      (selection.staged ? grouped.staged : grouped.unstaged).some(
        (file) => file.path === selection.path,
      );
    if (!stillThere) {
      const first = grouped.unstaged[0] ?? grouped.staged[0] ?? null;
      setSelection(first ? selectionFor(first, first === grouped.staged[0]) : null);
    }
  }, [status.data, grouped, selection]);

  const diff = useAsync(async () => {
    if (!selection) return "";
    return window.diffScope.getWorkingDiff(dir, {
      path: selection.path,
      staged: selection.staged,
      untracked: selection.untracked,
    });
  }, [dir, selection]);

  const branchInfo = status.data
    ? `${status.data.detached ? "detached HEAD" : (status.data.branch ?? "?")}` +
      (status.data.ahead !== null ? ` ↑${status.data.ahead} ↓${status.data.behind}` : "")
    : "";

  return (
    <div className="view">
      <section className="list-pane">
        <div className="list-pane-header">
          <span className="branch-info" title={branchInfo}>
            {branchInfo}
          </span>
          <button type="button" className="icon-button" title="새로고침" onClick={status.reload}>
            ⟳
          </button>
        </div>
        {status.error && <div className="error-note">{status.error}</div>}
        <FileList
          title="Staged"
          files={grouped.staged}
          staged={true}
          selection={selection}
          onSelect={setSelection}
        />
        <FileList
          title="Changes"
          files={grouped.unstaged}
          staged={false}
          selection={selection}
          onSelect={setSelection}
        />
      </section>
      {diff.error ? (
        <div className="diff-pane empty">{diff.error}</div>
      ) : (
        <DiffPane
          diff={diff.data ?? ""}
          emptyMessage={
            status.data && grouped.staged.length + grouped.unstaged.length === 0
              ? "변경사항이 없습니다"
              : "파일을 선택하세요"
          }
        />
      )}
    </div>
  );
}
