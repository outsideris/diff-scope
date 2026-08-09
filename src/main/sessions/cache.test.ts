import { mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileCache, TtlCache } from "./cache";

describe("FileCache", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "diff-scope-cache-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("reuses the cached value while the file is unchanged", async () => {
    const path = join(dir, "a.json");
    await writeFile(path, "v1");
    const loader = vi.fn(async () => "parsed");
    const cache = new FileCache<string>();

    await expect(cache.read(path, loader)).resolves.toBe("parsed");
    await expect(cache.read(path, loader)).resolves.toBe("parsed");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("reloads when mtime or size changes", async () => {
    const path = join(dir, "a.json");
    await writeFile(path, "v1");
    const loader = vi.fn(async () => "parsed");
    const cache = new FileCache<string>();

    await cache.read(path, loader);
    await writeFile(path, "v2 longer");
    await utimes(path, new Date(), new Date(Date.now() + 5000));
    await cache.read(path, loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("caches null loader results too", async () => {
    const path = join(dir, "a.json");
    await writeFile(path, "v1");
    const loader = vi.fn(async () => null);
    const cache = new FileCache<string | null>();

    await expect(cache.read(path, loader)).resolves.toBeNull();
    await expect(cache.read(path, loader)).resolves.toBeNull();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("returns null and drops the entry when the file disappears or the loader fails", async () => {
    const path = join(dir, "a.json");
    await writeFile(path, "v1");
    const cache = new FileCache<string>();

    await cache.read(path, async () => "parsed");
    await rm(path);
    await expect(cache.read(path, async () => "parsed")).resolves.toBeNull();
    expect(cache.size).toBe(0);

    await writeFile(path, "v2");
    await expect(
      cache.read(path, async () => {
        throw new Error("boom");
      }),
    ).resolves.toBeNull();
    expect(cache.size).toBe(0);
  });

  it("reloads when the content changes without changing the size", async () => {
    // 실제 워크로드(같은 길이로 덮어쓰는 메타 파일)에서 size만 비교하면 놓친다.
    const path = join(dir, "a.json");
    await writeFile(path, "v1");
    const loader = vi.fn(async () => "parsed");
    const cache = new FileCache<string>();

    await cache.read(path, loader);
    await writeFile(path, "v2");
    await utimes(path, new Date(), new Date(Date.now() + 5000));
    await cache.read(path, loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("retain keeps the listed entries and drops the rest", async () => {
    const a = join(dir, "a.json");
    const b = join(dir, "b.json");
    await writeFile(a, "a");
    await writeFile(b, "b");
    const cache = new FileCache<string>();
    await cache.read(a, async () => "a");
    await cache.read(b, async () => "b");

    cache.retain([a]);
    expect(cache.size).toBe(1);

    // 남은 항목이 정말 a인지 확인한다 — size만 보면 뒤집힌 retain도 통과한다.
    const reloadA = vi.fn(async () => "a");
    const reloadB = vi.fn(async () => "b");
    await cache.read(a, reloadA);
    await cache.read(b, reloadB);

    expect(reloadA).not.toHaveBeenCalled();
    expect(reloadB).toHaveBeenCalledTimes(1);
  });
});

describe("TtlCache", () => {
  it("reuses the value within the ttl and reloads after it", async () => {
    let now = 0;
    const cache = new TtlCache<string>(1000, () => now);
    const loader = vi.fn(async () => "value");

    await cache.get("k", loader);
    now = 999;
    await cache.get("k", loader);
    expect(loader).toHaveBeenCalledTimes(1);

    now = 1001;
    await cache.get("k", loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("reloads immediately when the key changes", async () => {
    let now = 0;
    const cache = new TtlCache<string>(1000, () => now);
    const loader = vi.fn(async () => "value");

    await cache.get("a", loader);
    now = 10;
    await cache.get("b", loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
