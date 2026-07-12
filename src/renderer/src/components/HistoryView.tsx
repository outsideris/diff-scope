import { type JSX, useEffect, useState } from "react";
import { relativeDate } from "../lib/format";
import { useAsync } from "../lib/useAsync";
import { DiffPane } from "./DiffPane";

export function HistoryView({ dir }: { dir: string }): JSX.Element {
  const log = useAsync(() => window.diffScope.getLog(dir, { limit: 200 }), [dir]);
  const [selectedHash, setSelectedHash] = useState<string | null>(null);

  useEffect(() => {
    setSelectedHash(null);
  }, [dir]);

  useEffect(() => {
    if (log.data === null) return;
    const stillThere = selectedHash !== null && log.data.some((c) => c.hash === selectedHash);
    if (!stillThere) setSelectedHash(log.data[0]?.hash ?? null);
  }, [log.data, selectedHash]);

  const diff = useAsync(async () => {
    if (!selectedHash) return "";
    return window.diffScope.getCommitDiff(dir, selectedHash);
  }, [dir, selectedHash]);

  const selected = log.data?.find((c) => c.hash === selectedHash) ?? null;

  return (
    <div className="view">
      <section className="list-pane">
        <div className="list-pane-header">
          <span className="branch-info">{log.data ? `${log.data.length}개 커밋` : ""}</span>
          <button type="button" className="icon-button" title="새로고침" onClick={log.reload}>
            ⟳
          </button>
        </div>
        {log.error && <div className="error-note">{log.error}</div>}
        <ul className="commit-list">
          {(log.data ?? []).map((commit) => (
            <li key={commit.hash}>
              <button
                type="button"
                className={`commit-item${commit.hash === selectedHash ? " selected" : ""}`}
                onClick={() => setSelectedHash(commit.hash)}
              >
                <span className="avatar">
                  {commit.authorName.trim().charAt(0).toUpperCase() || "?"}
                </span>
                <span className="cmeta">
                  <span className="commit-subject">{commit.subject}</span>
                  <span className="commit-meta">
                    <code>{commit.shortHash}</code> {relativeDate(commit.authorDate)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      {diff.error ? (
        <div className="diff-pane empty">{diff.error}</div>
      ) : (
        <div className="diff-with-header">
          {selected && (
            <div className="commit-detail">
              <div className="commit-detail-subject">{selected.subject}</div>
              <div className="commit-detail-meta">
                <code>{selected.shortHash}</code> · {selected.authorName} ·{" "}
                {new Date(selected.authorDate).toLocaleString()}
              </div>
              {selected.body && <pre className="commit-detail-body">{selected.body}</pre>}
            </div>
          )}
          <DiffPane diff={diff.data ?? ""} emptyMessage="커밋을 선택하세요" />
        </div>
      )}
    </div>
  );
}
