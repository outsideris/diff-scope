import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { RepositoryEntry } from "../../shared/git";

/**
 * 등록된 저장소 목록을 JSON 파일 하나로 영속화한다.
 * 경로가 git 저장소인지 검증하는 것은 호출자(IPC 핸들러)의 몫이다.
 */
export class RepositoryStore {
  constructor(private readonly filePath: string) {}

  async list(): Promise<RepositoryEntry[]> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }

    try {
      const data = JSON.parse(raw) as { repositories?: RepositoryEntry[] };
      return Array.isArray(data.repositories) ? data.repositories : [];
    } catch {
      // 깨진 파일은 빈 목록으로 취급한다. 다음 저장 때 정상 파일로 덮어쓴다.
      return [];
    }
  }

  async add(entry: RepositoryEntry): Promise<RepositoryEntry[]> {
    const current = await this.list();
    if (current.some((repo) => repo.path === entry.path)) return current;

    const next = [...current, entry];
    await this.save(next);
    return next;
  }

  async remove(path: string): Promise<RepositoryEntry[]> {
    const next = (await this.list()).filter((repo) => repo.path !== path);
    await this.save(next);
    return next;
  }

  private async save(repositories: RepositoryEntry[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify({ repositories }, null, 2)}\n`);
  }
}
