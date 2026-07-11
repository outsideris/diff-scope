import { runGit } from "./exec";

/** 임의 경로를 그 경로가 속한 저장소의 최상위 디렉토리로 해석한다. */
export async function resolveRepositoryRoot(path: string): Promise<string> {
  return (await runGit(path, ["rev-parse", "--show-toplevel"])).trim();
}
