import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { SqliteDatabase } from "../storage/database.js";
import { nowIso, sha256 } from "../shared/ids.js";

const execFileAsync = promisify(execFile);

export interface GitChange {
  status: string;
  path: string;
}

export interface GitSnapshot {
  available: boolean;
  head: string | null;
  branch: string | null;
  changes: GitChange[];
  diff: string;
  diffHash: string | null;
  capturedAt: string;
}

export async function captureGitState(db: SqliteDatabase, rootPath: string): Promise<GitSnapshot> {
  const capturedAt = nowIso();
  try {
    await git(rootPath, ["rev-parse", "--is-inside-work-tree"]);
  } catch {
    return { available: false, head: null, branch: null, changes: [], diff: "", diffHash: null, capturedAt };
  }
  const [head, branch, status, unstaged, staged] = await Promise.all([
    git(rootPath, ["rev-parse", "HEAD"]).catch(() => ""),
    git(rootPath, ["branch", "--show-current"]).catch(() => ""),
    git(rootPath, ["status", "--porcelain=v1", "--untracked-files=all"]),
    git(rootPath, ["diff", "--no-ext-diff", "--unified=1", "--", ":(exclude)*.lock"]),
    git(rootPath, ["diff", "--cached", "--no-ext-diff", "--unified=1", "--", ":(exclude)*.lock"]),
  ]);
  const diff = [unstaged, staged].filter(Boolean).join("\n");
  const snapshot: GitSnapshot = {
    available: true,
    head: head.trim() || null,
    branch: branch.trim() || null,
    changes: parseStatus(status),
    diff,
    diffHash: diff ? sha256(diff) : null,
    capturedAt,
  };
  const write = db.prepare(`
    INSERT INTO git_state (key, value, captured_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, captured_at = excluded.captured_at
  `);
  const transaction = db.transaction(() => {
    write.run("head", snapshot.head ?? "", capturedAt);
    write.run("branch", snapshot.branch ?? "", capturedAt);
    write.run("status", JSON.stringify(snapshot.changes), capturedAt);
    write.run("diff_hash", snapshot.diffHash ?? "", capturedAt);
  });
  transaction();
  return snapshot;
}

function parseStatus(value: string): GitChange[] {
  return value.split(/\r?\n/).filter(Boolean).map((line) => {
    const status = line.slice(0, 2).trim() || "?";
    const rawPath = line.slice(3).trim();
    const path = rawPath.includes(" -> ") ? rawPath.split(" -> ").at(-1)! : rawPath;
    return { status, path: path.replaceAll("\\", "/") };
  });
}

async function git(rootPath: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", ["-C", rootPath, ...args], {
    windowsHide: true,
    timeout: 15_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  return stdout;
}
