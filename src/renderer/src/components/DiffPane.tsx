import { DiffModeEnum, DiffView } from "@git-diff-view/react";
import { getDiffViewHighlighter } from "@git-diff-view/shiki";
import { type JSX, useEffect, useMemo, useState } from "react";
import { inferLang } from "../lib/lang";
import { type FileDiff, parseUnifiedDiff } from "../lib/parseDiff";

type Highlighter = Awaited<ReturnType<typeof getDiffViewHighlighter>>;

let highlighterPromise: Promise<Highlighter> | null = null;

function useHighlighter(): Highlighter | null {
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);

  useEffect(() => {
    highlighterPromise ??= getDiffViewHighlighter();
    let cancelled = false;
    highlighterPromise.then(
      (h) => {
        if (!cancelled) setHighlighter(h);
      },
      () => {
        // Shiki 초기화 실패 시 강조 없이 렌더링한다.
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return highlighter;
}

function useDarkMode(): boolean {
  const [dark, setDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const query = matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent): void => setDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return dark;
}

function fileLabel(file: FileDiff): string {
  if (file.isRename && file.oldPath && file.newPath) return `${file.oldPath} → ${file.newPath}`;
  return file.newPath ?? file.oldPath ?? "(unknown)";
}

function fileBadge(file: FileDiff): string | null {
  if (file.isNew) return "new";
  if (file.isDeleted) return "deleted";
  if (file.isRename) return "renamed";
  return null;
}

export function DiffPane({
  diff,
  emptyMessage,
}: {
  diff: string;
  emptyMessage: string;
}): JSX.Element {
  const files = useMemo(() => parseUnifiedDiff(diff), [diff]);
  const [mode, setMode] = useState<DiffModeEnum>(DiffModeEnum.Unified);
  const highlighter = useHighlighter();
  const dark = useDarkMode();

  if (files.length === 0) {
    return <div className="diff-pane empty">{emptyMessage}</div>;
  }

  return (
    <div className="diff-pane">
      <div className="diff-toolbar">
        <span className="diff-file-count">{files.length}개 파일</span>
        <div className="segmented">
          <button
            type="button"
            className={mode === DiffModeEnum.Unified ? "active" : ""}
            onClick={() => setMode(DiffModeEnum.Unified)}
          >
            Unified
          </button>
          <button
            type="button"
            className={mode === DiffModeEnum.Split ? "active" : ""}
            onClick={() => setMode(DiffModeEnum.Split)}
          >
            Split
          </button>
        </div>
      </div>
      <div className="diff-files">
        {files.map((file) => {
          const label = fileLabel(file);
          const badge = fileBadge(file);
          return (
            <section className="diff-file" key={label}>
              <header className="diff-file-header">
                <span className="diff-file-name">{label}</span>
                {badge && <span className={`badge badge-${badge}`}>{badge}</span>}
              </header>
              {file.isBinary ? (
                <div className="diff-file-note">바이너리 파일</div>
              ) : file.hunks === "" ? (
                <div className="diff-file-note">내용 변경 없음 (모드/메타데이터만 변경)</div>
              ) : (
                <DiffView
                  data={{
                    oldFile: { fileName: file.oldPath, fileLang: inferLang(file.oldPath) },
                    newFile: { fileName: file.newPath, fileLang: inferLang(file.newPath) },
                    hunks: [file.raw],
                  }}
                  diffViewMode={mode}
                  diffViewTheme={dark ? "dark" : "light"}
                  diffViewHighlight={highlighter !== null}
                  registerHighlighter={highlighter ?? undefined}
                  diffViewFontSize={12}
                />
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
