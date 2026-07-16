import type { SqliteDatabase } from "../storage/database.js";
import { captureVersionControlState } from "../vcs/vcs-service.js";

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
  const snapshot = await captureVersionControlState(db, rootPath);
  return {
    available: snapshot.kind === "git",
    head: snapshot.kind === "git" ? snapshot.revision : null,
    branch: snapshot.kind === "git" ? snapshot.branch : null,
    changes: snapshot.kind === "git" ? snapshot.changes : [],
    diff: snapshot.kind === "git" ? snapshot.diff : "",
    diffHash: snapshot.kind === "git" ? snapshot.diffHash : null,
    capturedAt: snapshot.capturedAt,
  };
}
