import { watch, type FSWatcher } from "node:fs";
import { ProjectContextError } from "../shared/errors.js";

export interface ProjectWatchStatus {
  projectId: string;
  rootPath: string;
  debounceMs: number;
  startedAt: string;
  pending: boolean;
  indexing: boolean;
  lastEventAt: string | null;
  lastIndexAt: string | null;
  lastError: { code: string; message: string; at: string } | null;
}

interface WatchEntry extends ProjectWatchStatus {
  watcher: FSWatcher;
  timer: NodeJS.Timeout | null;
  dirty: boolean;
}

export class ProjectWatchService {
  private readonly entries = new Map<string, WatchEntry>();

  constructor(private readonly runIndex: (projectId: string) => Promise<unknown>) {}

  start(projectId: string, rootPath: string, debounceMs = 1_000, initialIndex = true): ProjectWatchStatus {
    if (!Number.isInteger(debounceMs) || debounceMs < 100 || debounceMs > 60_000) {
      throw new ProjectContextError("INVALID_WATCH_DEBOUNCE", "Watch debounce must be between 100 and 60000 milliseconds.");
    }
    const existing = this.entries.get(projectId);
    if (existing) return publicStatus(existing);

    let entry: WatchEntry;
    try {
      const watcher = watch(rootPath, { recursive: true }, () => {
        entry.lastEventAt = new Date().toISOString();
        entry.dirty = true;
        this.schedule(entry);
      });
      entry = {
        projectId,
        rootPath,
        debounceMs,
        startedAt: new Date().toISOString(),
        pending: false,
        indexing: false,
        lastEventAt: null,
        lastIndexAt: null,
        lastError: null,
        watcher,
        timer: null,
        dirty: initialIndex,
      };
      watcher.on("error", (error) => {
        entry.lastError = { code: "WATCH_ERROR", message: error.message, at: new Date().toISOString() };
      });
      this.entries.set(projectId, entry);
      if (initialIndex) this.schedule(entry, 0);
      return publicStatus(entry);
    } catch (error) {
      throw new ProjectContextError(
        "WATCH_START_FAILED",
        `Unable to watch project root: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  stop(projectId: string): ProjectWatchStatus {
    const entry = this.entries.get(projectId);
    if (!entry) throw new ProjectContextError("WATCH_NOT_FOUND", `Project is not being watched: ${projectId}`);
    if (entry.timer) clearTimeout(entry.timer);
    entry.watcher.close();
    this.entries.delete(projectId);
    return publicStatus(entry);
  }

  list(): ProjectWatchStatus[] {
    return [...this.entries.values()].map(publicStatus);
  }

  stopAll(): void {
    for (const projectId of [...this.entries.keys()]) this.stop(projectId);
  }

  private schedule(entry: WatchEntry, delay = entry.debounceMs): void {
    if (entry.timer) clearTimeout(entry.timer);
    entry.pending = true;
    entry.timer = setTimeout(() => {
      entry.timer = null;
      void this.flush(entry);
    }, delay);
  }

  private async flush(entry: WatchEntry): Promise<void> {
    if (!this.entries.has(entry.projectId)) return;
    if (entry.indexing) {
      entry.dirty = true;
      this.schedule(entry);
      return;
    }
    entry.pending = false;
    entry.dirty = false;
    entry.indexing = true;
    try {
      await this.runIndex(entry.projectId);
      entry.lastIndexAt = new Date().toISOString();
      entry.lastError = null;
    } catch (error) {
      const code = error instanceof ProjectContextError ? error.code : "INDEX_FAILED";
      entry.lastError = {
        code,
        message: error instanceof Error ? error.message : String(error),
        at: new Date().toISOString(),
      };
      if (code === "INDEX_ALREADY_RUNNING") entry.dirty = true;
    } finally {
      entry.indexing = false;
      if (entry.dirty && this.entries.has(entry.projectId)) this.schedule(entry);
    }
  }
}

function publicStatus(entry: WatchEntry): ProjectWatchStatus {
  return {
    projectId: entry.projectId,
    rootPath: entry.rootPath,
    debounceMs: entry.debounceMs,
    startedAt: entry.startedAt,
    pending: entry.pending,
    indexing: entry.indexing,
    lastEventAt: entry.lastEventAt,
    lastIndexAt: entry.lastIndexAt,
    lastError: entry.lastError,
  };
}
