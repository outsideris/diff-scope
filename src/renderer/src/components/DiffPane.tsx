import type { FileDiffLoadedFiles, FileDiffMetadata, FileDiffOptions } from "@pierre/diffs";
import type { VirtualFileMetrics } from "@pierre/diffs";
import { PatchDiff, Virtualizer } from "@pierre/diffs/react";
import { type JSX, useEffect, useMemo, useRef, useState } from "react";
import type { DiffRevisions } from "../../../shared/git";
import { splitPath } from "../lib/format";
import {
  countHunkLines,
  estimateHunkRows,
  type FileDiff,
  parseUnifiedDiff,
} from "../lib/parseDiff";

type DiffStyle = "unified" | "split";

/** styles.css의 `--diffs-line-height`와 맞춘다. 자리표시자 높이 계산용. */
const ROW_HEIGHT = 18;
/** hunk 구분자 한 줄의 대략적인 높이 */
const SEPARATOR_HEIGHT = 32;
/** 뷰포트에서 이만큼 떨어진 파일까지 미리 마운트한다 */
const PRELOAD_MARGIN = "800px";
/** 지연 마운트 판정의 기준이 되는 스크롤 컨테이너 */
const SCROLLER_SELECTOR = ".diff-files";

/**
 * diff 표면 배경을 앱 카드(`--panel`)에 맞춘다.
 *
 * 폰트·크기 같은 `--diffs-*` 변수는 `:root`에 두면 shadow 경계를 넘어 상속되지만,
 * `--diffs-bg` 계열은 라이브러리가 `:host`에 직접 선언해서 상속이 이기지 못한다.
 * (다크 모드에서 카드는 #26272d인데 diff 표면만 #0a0a0a로 떠 보였다.)
 * `unsafeCSS`는 테마보다 뒤 레이어에 들어가므로 여기서만 덮는다.
 */
const DIFF_SURFACE_CSS = `
  :host {
    --diffs-bg: var(--panel);
  }
`;

/**
 * 가상화가 아직 그리지 않은 줄의 높이를 어림하는 값. 실제 CSS와 맞춰야 스크롤이 덜 튄다.
 * 파일 헤더는 앱이 카드 바깥에 그리므로 라이브러리 쪽 헤더 높이는 0이다.
 */
const VIRTUAL_METRICS: VirtualFileMetrics = {
  hunkLineCount: 50,
  lineHeight: ROW_HEIGHT,
  diffHeaderHeight: 0,
  spacing: 8,
};

/**
 * 화면(스크롤 컨테이너) 근처에 올 때까지 diff 본문 마운트를 미룬다.
 *
 * 커밋 하나에 파일이 수십 개면 전부 마운트하는 비용이 크다. 파일 내부 줄 수보다
 * DOM 총량이 병목이라 파일 단위로 늦추는 것만으로 충분히 효과가 있다.
 * 한 번 보이면 계속 마운트해 둔다 — 다시 접으면 스크롤 위치가 튄다.
 */
function LazyDiffBody({
  patch,
  options,
  placeholderHeight,
}: {
  patch: string;
  options: FileDiffOptions<undefined>;
  placeholderHeight: number;
}): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return;
    const element = ref.current;
    if (!element) return;

    // IntersectionObserver가 없는 환경(테스트 등)에서는 그냥 바로 마운트한다.
    if (typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }

    // 스크롤 컨테이너는 Virtualizer가 만든 바깥 div다. ref 접근 순서에 기대지 않도록
    // 자리표시자에서 거슬러 올라가 찾는다.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setMounted(true);
      },
      { root: element.closest(SCROLLER_SELECTOR), rootMargin: PRELOAD_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [mounted]);

  return (
    <div ref={ref} style={mounted ? undefined : { height: placeholderHeight }}>
      {mounted && <PatchDiff patch={patch} options={options} metrics={VIRTUAL_METRICS} />}
    </div>
  );
}

/**
 * 컨텍스트 확장용 원본을 메인 프로세스에서 가져온다.
 *
 * patch만으로 만든 diff는 `isPartial`이라 patch에 담긴 줄 밖으로는 확장할 수 없다.
 * 이 로더를 넘기면 라이브러리가 확장 버튼을 노출하고, 눌렀을 때만 원본을 요청한다.
 */
function createFileLoader(dir: string, revisions: DiffRevisions) {
  return async (fileDiff: FileDiffMetadata): Promise<FileDiffLoadedFiles> => {
    const newPath = fileDiff.name;
    const oldPath = fileDiff.prevName ?? newPath;
    const [oldContents, newContents] = await Promise.all([
      window.diffScope.getFileContents(dir, { path: oldPath, rev: revisions.oldRev }),
      window.diffScope.getFileContents(dir, { path: newPath, rev: revisions.newRev }),
    ]);

    if (newContents === null) throw new Error(`파일 내용을 읽지 못했습니다: ${newPath}`);
    const newFile = { name: newPath, contents: newContents };

    // 내용 변경 없는 rename은 라이브러리 계약상 oldFile을 null로 넘긴다.
    if (fileDiff.type === "rename-pure") return { oldFile: null, newFile };
    if (oldContents === null) throw new Error(`파일 내용을 읽지 못했습니다: ${oldPath}`);
    return { oldFile: { name: oldPath, contents: oldContents }, newFile };
  };
}

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

/** 아직 마운트하지 않은 파일이 차지할 자리 높이 */
function placeholderHeight(file: FileDiff): number {
  const { lines, separators } = estimateHunkRows(file.hunks);
  return lines * ROW_HEIGHT + separators * SEPARATOR_HEIGHT;
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
  dir,
  revisions,
}: {
  diff: string;
  emptyMessage: string;
  /** git 명령을 실행할 워킹 디렉토리 */
  dir: string;
  /** 이 diff가 비교한 두 리비전 (컨텍스트 확장용 원본을 읽을 때 쓴다) */
  revisions: DiffRevisions;
}): JSX.Element {
  const files = useMemo(() => parseUnifiedDiff(diff), [diff]);
  const [diffStyle, setDiffStyle] = useState<DiffStyle>("unified");

  // themeType은 기본값 "system"이라 OS 다크 모드를 라이브러리가 직접 따라간다.
  // 파일 헤더는 앱이 직접 그리므로 라이브러리 헤더는 끈다.
  const options = useMemo<FileDiffOptions<undefined>>(
    () => ({
      diffStyle,
      disableFileHeader: true,
      unsafeCSS: DIFF_SURFACE_CSS,
      loadDiffFiles: createFileLoader(dir, revisions),
    }),
    [diffStyle, dir, revisions],
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
      {/* Virtualizer 안에서는 각 PatchDiff가 VirtualizedFileDiff로 승격돼 보이는 줄만 그린다.
          바깥 div가 스크롤 컨테이너, 안쪽 div가 실제 목록이다. */}
      <Virtualizer className="diff-files" contentClassName="diff-files-content">
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
                <LazyDiffBody
                  patch={file.raw}
                  options={options}
                  placeholderHeight={placeholderHeight(file)}
                />
              )}
            </section>
          );
        })}
      </Virtualizer>
    </div>
  );
}
