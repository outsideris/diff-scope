export interface FileDiff {
  /** 변경 전 경로. 새 파일이면 null */
  oldPath: string | null;
  /** 변경 후 경로. 삭제된 파일이면 null */
  newPath: string | null;
  /** 첫 `@@`부터 섹션 끝까지의 hunk 원문. 없으면 빈 문자열 */
  hunks: string;
  /** `diff --git` 헤더를 포함한 섹션 전체 원문 (diff 렌더러에 그대로 넘긴다) */
  raw: string;
  isBinary: boolean;
  isNew: boolean;
  isDeleted: boolean;
  isRename: boolean;
}

/** git diff 원문(여러 파일)을 `diff --git` 섹션 단위로 쪼갠다. */
export function parseUnifiedDiff(raw: string): FileDiff[] {
  const lines = raw.split("\n");
  const starts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("diff --git ")) starts.push(i);
  }

  return starts.map((start, index) => {
    const end = index + 1 < starts.length ? starts[index + 1] : lines.length;
    return parseSection(lines.slice(start, end));
  });
}

function parseSection(lines: string[]): FileDiff {
  const file: FileDiff = {
    oldPath: null,
    newPath: null,
    hunks: "",
    raw: lines.join("\n").replace(/\n+$/, ""),
    isBinary: false,
    isNew: false,
    isDeleted: false,
    isRename: false,
  };

  let hunkStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("@@")) {
      hunkStart = i;
      break;
    }

    if (line.startsWith("new file mode")) {
      file.isNew = true;
    } else if (line.startsWith("deleted file mode")) {
      file.isDeleted = true;
    } else if (line.startsWith("rename from ")) {
      file.isRename = true;
      file.oldPath = unquote(line.slice("rename from ".length));
    } else if (line.startsWith("rename to ")) {
      file.isRename = true;
      file.newPath = unquote(line.slice("rename to ".length));
    } else if (line.startsWith("Binary files ") || line === "GIT binary patch") {
      file.isBinary = true;
    } else if (line.startsWith("--- ")) {
      file.oldPath = parseFileHeaderPath(line.slice(4), "a/");
    } else if (line.startsWith("+++ ")) {
      file.newPath = parseFileHeaderPath(line.slice(4), "b/");
    }
  }

  if (hunkStart >= 0) {
    file.hunks = lines.slice(hunkStart).join("\n").replace(/\n+$/, "");
  }

  // 바이너리 신규/삭제처럼 ---/+++ 헤더가 없는 섹션은 diff --git 라인에서 경로를 얻는다.
  if (file.oldPath === null && file.newPath === null) {
    const paths = parseGitHeaderPaths(lines[0]);
    if (paths) {
      file.oldPath = file.isNew ? null : paths.oldPath;
      file.newPath = file.isDeleted ? null : paths.newPath;
    }
  }

  return file;
}

/** `--- a/path`, `+++ b/path` 헤더의 경로. `/dev/null`은 null */
function parseFileHeaderPath(rawPath: string, prefix: "a/" | "b/"): string | null {
  const path = unquote(rawPath.replace(/\t$/, ""));
  if (path === "/dev/null") return null;
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}

/** `diff --git a/old b/new` 라인에서 경로 추출 (공백 경로는 최선 노력) */
function parseGitHeaderPaths(line: string): { oldPath: string; newPath: string } | null {
  const rest = line.slice("diff --git ".length);
  if (rest.startsWith('"')) {
    const match = /^"((?:[^"\\]|\\.)*)" "?b\/((?:[^"\\]|\\.)*)"?$/.exec(rest);
    if (match) return { oldPath: unquote(`"${match[1]}"`).replace(/^a\//, ""), newPath: match[2] };
    return null;
  }
  const splitAt = rest.lastIndexOf(" b/");
  if (splitAt <= 0 || !rest.startsWith("a/")) return null;
  return { oldPath: rest.slice(2, splitAt), newPath: rest.slice(splitAt + 3) };
}

/** git이 특수문자 경로에 쓰는 C 스타일 quoting을 해제한다. */
function unquote(path: string): string {
  if (!path.startsWith('"') || !path.endsWith('"')) return path;
  return path
    .slice(1, -1)
    .replace(/\\([\\"tnr])/g, (_, ch: string) =>
      ch === "t" ? "\t" : ch === "n" ? "\n" : ch === "r" ? "\r" : ch,
    );
}
