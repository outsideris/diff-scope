import { stat } from "node:fs/promises";

interface FileEntry<T> {
  mtimeMs: number;
  size: number;
  value: T;
}

/**
 * 파일 mtime+size가 바뀌지 않았으면 loader를 건너뛰고 이전 결과를 재사용하는 캐시.
 * 폴링/푸시로 같은 파일들을 반복 스캔할 때 파싱 비용을 없앤다.
 */
export class FileCache<T> {
  private readonly entries = new Map<string, FileEntry<T>>();

  /**
   * 파일이 그대로면 캐시된 값을, 바뀌었으면 loader 결과를 반환한다.
   * stat 실패(삭제된 파일)나 loader 실패는 null을 반환하고 항목을 제거한다.
   */
  async read(path: string, loader: () => Promise<T>): Promise<T | null> {
    let info;
    try {
      info = await stat(path);
    } catch {
      this.entries.delete(path);
      return null;
    }

    const hit = this.entries.get(path);
    if (hit && hit.mtimeMs === info.mtimeMs && hit.size === info.size) return hit.value;

    let value: T;
    try {
      value = await loader();
    } catch {
      this.entries.delete(path);
      return null;
    }
    this.entries.set(path, { mtimeMs: info.mtimeMs, size: info.size, value });
    return value;
  }

  /** 이번 스캔에 등장한 경로만 남기고 정리해 무한 성장을 막는다. */
  retain(paths: Iterable<string>): void {
    const keep = new Set(paths);
    for (const key of this.entries.keys()) {
      if (!keep.has(key)) this.entries.delete(key);
    }
  }

  get size(): number {
    return this.entries.size;
  }
}

/**
 * 같은 key에 대해 TTL 안에는 loader를 다시 실행하지 않는 캐시.
 * key가 바뀌면(대상 목록 변경 등) 즉시 다시 로드한다.
 */
export class TtlCache<T> {
  private key: string | null = null;
  private value: T | null = null;
  private loadedAt = 0;

  constructor(
    private readonly ttlMs: number,
    private readonly clock: () => number = Date.now,
  ) {}

  async get(key: string, loader: () => Promise<T>): Promise<T> {
    if (this.value !== null && this.key === key && this.clock() - this.loadedAt < this.ttlMs) {
      return this.value;
    }
    const value = await loader();
    this.key = key;
    this.value = value;
    this.loadedAt = this.clock();
    return value;
  }
}
