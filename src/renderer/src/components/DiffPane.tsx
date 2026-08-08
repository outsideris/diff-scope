import type { FileDiffOptions } from "@pierre/diffs";
import { PatchDiff } from "@pierre/diffs/react";
import { type JSX, useMemo, useState } from "react";
import { splitPath } from "../lib/format";
import { countHunkLines, type FileDiff, parseUnifiedDiff } from "../lib/parseDiff";

type DiffStyle = "unified" | "split";

function fileLabel(file: FileDiff): string {
  if (file.isRename && file.oldPath && file.newPath) return `${file.oldPath} → ${file.newPath}`;
  return file.newPath ?? file.oldPath ?? "(unknown)";
}

function FileName({ file }: { file: FileDiff }): JSX.Element {
  if (file.isRename && file.oldPath && file.newPath) {
    return (
      <span className="diff-file-name">
        <span className="fdir">{file.oldPath} → </span>
        <span className="fname">{file.newPath}</span>
      </span>
    );
  }
  const { dir, name } = splitPath(file.newPath ?? file.oldPath ?? "(unknown)");
  return (
    <span className="diff-file-name">
      <span className="fdir">{dir}</span>
      <span className="fname">{name}</span>
    </span>
  );
}

function HunkDelta({ file }: { file: FileDiff }): JSX.Element | null {
  if (file.isBinary || file.hunks === "") return null;
  const { added, deleted } = countHunkLines(file.hunks);
  return (
    <span className="delta">
      {added > 0 && <span className="p">+{added}</span>}{" "}
      {deleted > 0 && <span className="m">−{deleted}</span>}
    </span>
  );
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
  const [diffStyle, setDiffStyle] = useState<DiffStyle>("unified");

  // themeType은 기본값 "system"이라 OS 다크 모드를 라이브러리가 직접 따라간다.
  // 파일 헤더는 앱이 직접 그리므로 라이브러리 헤더는 끈다.
  const options = useMemo<FileDiffOptions<undefined>>(
    () => ({ diffStyle, disableFileHeader: true }),
    [diffStyle],
  );

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
            className={diffStyle === "unified" ? "active" : ""}
            onClick={() => setDiffStyle("unified")}
          >
            Unified
          </button>
          <button
            type="button"
            className={diffStyle === "split" ? "active" : ""}
            onClick={() => setDiffStyle("split")}
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
                <FileName file={file} />
                {badge && <span className={`badge badge-${badge}`}>{badge}</span>}
                <span className="spacer"></span>
                <HunkDelta file={file} />
              </header>
              {file.isBinary ? (
                <div className="diff-file-note">바이너리 파일</div>
              ) : file.hunks === "" ? (
                <div className="diff-file-note">내용 변경 없음 (모드/메타데이터만 변경)</div>
              ) : (
                <PatchDiff patch={file.raw} options={options} />
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
