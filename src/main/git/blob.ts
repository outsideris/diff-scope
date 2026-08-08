import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FileContentsRequest } from "../../shared/git";
import { GitError, runGit } from "./exec";

/**
 * 특정 리비전의 파일 내용을 반환한다. diff 뷰의 컨텍스트 확장(hunk expansion)에 쓴다.
 *
 * - `rev`가 null이면 워킹 트리의 파일을 그대로 읽는다.
 * - 그 외에는 `git show <rev>:<path>`. `INDEX_REV`(`":0"`)면 인덱스의 스테이징된 내용이다.
 *
 * 해당 리비전에 파일이 없으면(신규 파일, 루트 커밋의 부모 등) null을 반환한다.
 */
export async function getFileContents(
  cwd: string,
  { path, rev }: FileContentsRequest,
): Promise<string | null> {
  if (rev === null) {
    try {
      return await readFile(join(cwd, path), "utf8");
    } catch {
      return null;
    }
  }

  try {
    return await runGit(cwd, ["show", `${rev}:${path}`]);
  } catch (error) {
    // 리비전에 해당 경로가 없으면 git이 128로 종료한다. 확장할 내용이 없다는 뜻이라 null.
    if (error instanceof GitError) return null;
    throw error;
  }
}
