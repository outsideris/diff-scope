import { watch, type FSWatcher } from "node:fs";
import { claudeStoreDir } from "./sessions/claudeStore";
import { codexDir } from "./sessions/codex";
import { runningSessionsDir } from "./sessions/running";
import { projectsDir } from "./sessions/transcripts";

export type WatchSource =
  | "claude-projects"
  | "claude-running"
  | "claude-store"
  | "codex"
  | "worktree";

/** 빌드 산출물·git 내부 등 dirty 상태와 무관하게 자주 바뀌는 경로 */
const NOISY_WORKTREE_PATH =
  /(^|\/)(node_modules|\.git\/(objects|logs)|out|release|dist|coverage|\.DS_Store)(\/|$)/;

export function isNoisyWorktreePath(relPath: string): boolean {
  return NOISY_WORKTREE_PATH.test(relPath);
}

/**
 * fs 이벤트가 사이드바 갱신을 유발해야 하는지 판정한다.
 * 스트리밍 append처럼 표시에 영향 없는 이벤트는 걸러 갱신 폭주를 막는다.
 */
export function shouldRefresh(
  source: WatchSource,
  eventType: string,
  filename: string | null,
): boolean {
  const path = filename ?? "";
  const base = path.split("/").pop() ?? "";

  switch (source) {
    case "claude-projects":
      // 전사 생성/삭제만 의미 있음 — 대화 append(change)는 무시.
      // 다만 macOS FSEvents는 갓 생성된 파일의 append도 잠시(약 10~15초) rename으로 보고하므로
      // 새 세션 직후에는 몇 번 더 갱신될 수 있다. 디바운스가 그 비용을 흡수한다.
      return eventType === "rename" && base.endsWith(".jsonl");
    case "claude-running":
      return base.endsWith(".json");
    case "claude-store":
      return base.startsWith("local_") && base.endsWith(".json");
    case "codex":
      if (base === "session_index.jsonl") return true;
      // rollout 생성/삭제/아카이브 이동만 — 진행 중 append는 무시 (위와 같은 rename 한계 적용)
      return eventType === "rename" && base.startsWith("rollout-") && base.endsWith(".jsonl");
    case "worktree":
      return !isNoisyWorktreePath(path);
  }
}

/**
 * trailing 디바운스(delayMs) + 최소 발화 간격(minGapMs).
 * 타이머가 예약된 동안의 추가 trigger는 흡수된다 (연속 이벤트에도 굶지 않음).
 */
export class Debouncer {
  private timer: NodeJS.Timeout | null = null;
  private lastFiredAt = 0;

  constructor(
    private readonly fn: () => void,
    private readonly delayMs: number,
    private readonly minGapMs: number,
  ) {}

  trigger(): void {
    if (this.timer) return;
    const wait = Math.max(this.delayMs, this.lastFiredAt + this.minGapMs - Date.now());
    this.timer = setTimeout(() => {
      this.timer = null;
      this.lastFiredAt = Date.now();
      this.fn();
    }, wait);
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

/**
 * 세션 소스 디렉토리와 등록된 워크트리를 감시해, 변경이 있으면
 * 디바운스된 onChange를 호출한다 (macOS FSEvents 기반 fs.watch recursive).
 * 감시 실패(디렉토리 없음 등)는 조용히 건너뛴다 — 안전망 폴링이 보정한다.
 */
export class SidebarWatcher {
  private readonly debouncer: Debouncer;
  private readonly sourceWatchers = new Map<WatchSource, FSWatcher>();
  private readonly worktreeWatchers = new Map<string, FSWatcher>();

  constructor(onChange: () => void, delayMs = 500, minGapMs = 3000) {
    this.debouncer = new Debouncer(onChange, delayMs, minGapMs);
  }

  start(): void {
    this.watchMissingSources();
  }

  /** 감시할 워크트리 목록을 현재 등록 상태와 동기화한다. */
  syncWorktrees(paths: string[]): void {
    // 실행 시점에 없던 소스 디렉토리(Codex 미설치 등)가 뒤늦게 생길 수 있어 매번 다시 시도한다.
    // 렌더러가 갱신마다 호출하므로 별도 타이머 없이 재시도 지점이 된다.
    this.watchMissingSources();

    const next = new Set(paths);
    for (const [path, watcher] of this.worktreeWatchers) {
      if (!next.has(path)) {
        watcher.close();
        this.worktreeWatchers.delete(path);
      }
    }
    for (const path of next) {
      if (this.worktreeWatchers.has(path)) continue;
      const watcher = this.tryWatch("worktree", path);
      if (watcher) this.worktreeWatchers.set(path, watcher);
    }
  }

  dispose(): void {
    this.debouncer.dispose();
    for (const watcher of this.sourceWatchers.values()) watcher.close();
    this.sourceWatchers.clear();
    for (const watcher of this.worktreeWatchers.values()) watcher.close();
    this.worktreeWatchers.clear();
  }

  /** 아직 붙지 못한 세션 소스 디렉토리에 감시를 건다. 이미 붙은 것은 건드리지 않는다. */
  private watchMissingSources(): void {
    const sources: Array<[WatchSource, string]> = [
      ["claude-projects", projectsDir()],
      ["claude-running", runningSessionsDir()],
      ["claude-store", claudeStoreDir()],
      ["codex", codexDir()],
    ];
    for (const [source, dir] of sources) {
      if (this.sourceWatchers.has(source)) continue;
      const watcher = this.tryWatch(source, dir);
      if (watcher) this.sourceWatchers.set(source, watcher);
    }
  }

  private tryWatch(source: WatchSource, dir: string): FSWatcher | null {
    try {
      const watcher = watch(dir, { recursive: true }, (eventType, filename) => {
        const name = typeof filename === "string" ? filename : null;
        if (shouldRefresh(source, eventType, name)) this.debouncer.trigger();
      });
      watcher.on("error", () => watcher.close());
      return watcher;
    } catch {
      return null;
    }
  }
}
