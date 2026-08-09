import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { watch } = vi.hoisted(() => ({ watch: vi.fn() }));
vi.mock("node:fs", () => ({ watch }));

const { Debouncer, isNoisyWorktreePath, shouldRefresh, SidebarWatcher } = await import("./watcher");

/** watch()가 돌려줄 가짜 FSWatcher */
function fakeWatcher(): { close: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> } {
  return { close: vi.fn(), on: vi.fn() };
}

describe("shouldRefresh", () => {
  it("claude-projects: reacts only to transcript rename, not appends", () => {
    expect(shouldRefresh("claude-projects", "rename", "-proj-dir/abc.jsonl")).toBe(true);
    expect(shouldRefresh("claude-projects", "change", "-proj-dir/abc.jsonl")).toBe(false);
    expect(shouldRefresh("claude-projects", "rename", "-proj-dir/memory/MEMORY.md")).toBe(false);
  });

  it("claude-running: reacts to pid json files", () => {
    expect(shouldRefresh("claude-running", "rename", "12345.json")).toBe(true);
    expect(shouldRefresh("claude-running", "change", "12345.json")).toBe(true);
    expect(shouldRefresh("claude-running", "rename", "12345.lock")).toBe(false);
  });

  it("claude-store: reacts only to local_*.json metas", () => {
    expect(shouldRefresh("claude-store", "change", "ws/proj/local_abc.json")).toBe(true);
    expect(shouldRefresh("claude-store", "change", "ws/proj/other.json")).toBe(false);
  });

  it("codex: reacts to the session index and rollout renames, not rollout appends", () => {
    expect(shouldRefresh("codex", "change", "session_index.jsonl")).toBe(true);
    expect(shouldRefresh("codex", "rename", "sessions/2026/07/19/rollout-x.jsonl")).toBe(true);
    expect(shouldRefresh("codex", "change", "sessions/2026/07/19/rollout-x.jsonl")).toBe(false);
    expect(shouldRefresh("codex", "rename", "config.toml")).toBe(false);
  });

  it("worktree: filters noisy build/git-internal paths", () => {
    expect(shouldRefresh("worktree", "change", "src/app.ts")).toBe(true);
    expect(shouldRefresh("worktree", "change", ".git/index")).toBe(true);
    expect(shouldRefresh("worktree", "change", "node_modules/react/index.js")).toBe(false);
    expect(shouldRefresh("worktree", "rename", ".git/objects/ab/cdef")).toBe(false);
    expect(shouldRefresh("worktree", "rename", "out/main/index.js")).toBe(false);
    expect(shouldRefresh("worktree", "change", ".DS_Store")).toBe(false);
  });
});

describe("isNoisyWorktreePath", () => {
  it("matches noisy directories at any depth", () => {
    expect(isNoisyWorktreePath("packages/a/node_modules/x.js")).toBe(true);
    expect(isNoisyWorktreePath("release/mac-arm64/app")).toBe(true);
    expect(isNoisyWorktreePath("src/release-notes.md")).toBe(false);
    expect(isNoisyWorktreePath(".git/HEAD")).toBe(false);
  });

  it("suppresses build directory names at any depth, even when tracked", () => {
    // 의도한 절충: monorepo의 packages/*/dist 폭주를 막는 대신, dist/out/release/coverage를
    // 실제로 추적하는 저장소는 그 경로 변경이 안전망 폴링까지 늦게 반영된다.
    expect(isNoisyWorktreePath("packages/ui/dist/index.js")).toBe(true);
    expect(isNoisyWorktreePath("docs/coverage/report.html")).toBe(true);
    // 이름이 겹치는 파일까지 막지는 않는다.
    expect(isNoisyWorktreePath("src/dist-config.ts")).toBe(false);
    expect(isNoisyWorktreePath("outline.md")).toBe(false);
  });
});

describe("Debouncer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces a burst into a single trailing fire", () => {
    const fn = vi.fn();
    const debouncer = new Debouncer(fn, 500, 3000);

    debouncer.trigger();
    debouncer.trigger();
    debouncer.trigger();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("enforces the minimum gap between fires", () => {
    const fn = vi.fn();
    const debouncer = new Debouncer(fn, 500, 3000);

    debouncer.trigger();
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);

    debouncer.trigger();
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1); // 아직 최소 간격 미달

    vi.advanceTimersByTime(2500); // 발화 후 3초 경과 시점
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("absorbs triggers during the wait instead of pushing the fire out", () => {
    const fn = vi.fn();
    const debouncer = new Debouncer(fn, 500, 3000);

    debouncer.trigger();
    vi.advanceTimersByTime(300);
    debouncer.trigger(); // 예약된 타이머를 밀어내지 않고 흡수된다

    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1); // t=800이 아니라 t=500에 발화
  });

  it("does not starve when events keep arriving", () => {
    const fn = vi.fn();
    const debouncer = new Debouncer(fn, 500, 3000);

    // 100ms마다 이벤트가 계속 들어와도 최소 간격마다 꾸준히 발화한다.
    for (let elapsed = 0; elapsed < 7000; elapsed += 100) {
      debouncer.trigger();
      vi.advanceTimersByTime(100);
    }

    expect(fn).toHaveBeenCalledTimes(3); // t=500, t=3500, t=6500
  });

  it("dispose cancels a pending fire", () => {
    const fn = vi.fn();
    const debouncer = new Debouncer(fn, 500, 3000);

    debouncer.trigger();
    debouncer.dispose();
    vi.advanceTimersByTime(5000);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("SidebarWatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    watch.mockImplementation(() => fakeWatcher());
  });

  /** watch()가 호출된 디렉토리 목록 */
  function watched(): string[] {
    return watch.mock.calls.map(([dir]) => dir as string);
  }

  it("watches every session source directory on start", () => {
    const sidebar = new SidebarWatcher(vi.fn());
    sidebar.start();

    expect(watch).toHaveBeenCalledTimes(4);
    for (const [, options] of watch.mock.calls) {
      expect(options).toEqual({ recursive: true });
    }
  });

  it("adds and removes worktree watchers to match the given list", () => {
    const byDir = new Map<string, ReturnType<typeof fakeWatcher>>();
    watch.mockImplementation((dir: string) => {
      const created = fakeWatcher();
      byDir.set(dir, created);
      return created;
    });

    const sidebar = new SidebarWatcher(vi.fn());
    sidebar.syncWorktrees(["/repos/a", "/repos/b"]);
    expect(watched()).toEqual(expect.arrayContaining(["/repos/a", "/repos/b"]));

    watch.mockClear();
    sidebar.syncWorktrees(["/repos/b"]);

    expect(byDir.get("/repos/a")?.close).toHaveBeenCalledTimes(1); // 빠진 워크트리는 정리한다
    expect(byDir.get("/repos/b")?.close).not.toHaveBeenCalled();
    expect(watched()).not.toContain("/repos/b"); // 남은 워크트리는 다시 붙이지 않는다
  });

  it("does not re-watch worktrees it already watches", () => {
    const sidebar = new SidebarWatcher(vi.fn());
    sidebar.syncWorktrees(["/repos/a"]);

    watch.mockClear();
    sidebar.syncWorktrees(["/repos/a"]);

    expect(watched()).not.toContain("/repos/a");
  });

  it("retries a source directory that was missing at start", () => {
    const sidebar = new SidebarWatcher(vi.fn());
    // 실행 시점에 하나도 붙지 못한 상황 (예: Codex 미설치)
    watch.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    sidebar.start();
    expect(watch).toHaveBeenCalledTimes(4);

    watch.mockClear();
    watch.mockImplementation(() => fakeWatcher());
    sidebar.syncWorktrees([]);

    expect(watch).toHaveBeenCalledTimes(4); // 뒤늦게 생긴 소스에 다시 시도한다

    watch.mockClear();
    sidebar.syncWorktrees([]);
    expect(watch).not.toHaveBeenCalled(); // 붙은 뒤에는 다시 시도하지 않는다
  });

  it("dispose closes source and worktree watchers", () => {
    const sidebar = new SidebarWatcher(vi.fn());
    const created: ReturnType<typeof fakeWatcher>[] = [];
    watch.mockImplementation(() => {
      const w = fakeWatcher();
      created.push(w);
      return w;
    });

    sidebar.start();
    sidebar.syncWorktrees(["/repos/a"]);
    sidebar.dispose();

    expect(created).toHaveLength(5);
    for (const w of created) expect(w.close).toHaveBeenCalledTimes(1);
  });

  it("triggers the debounced callback only for events that matter", () => {
    vi.useFakeTimers();
    try {
      const onChange = vi.fn();
      const sidebar = new SidebarWatcher(onChange);
      sidebar.syncWorktrees(["/repos/a"]);

      // 마지막 watch 호출이 워크트리 감시다 (소스 감시가 먼저 등록된다).
      const listener = watch.mock.calls.at(-1)?.[2] as (event: string, file: string) => void;

      listener("change", "node_modules/react/index.js");
      vi.advanceTimersByTime(1000);
      expect(onChange).not.toHaveBeenCalled(); // noisy 경로는 디바운서까지 가지 않는다

      listener("change", "src/app.ts");
      vi.advanceTimersByTime(500);
      expect(onChange).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
