import type { SqliteDatabase } from "../storage/database.js";
import { createId, nowIso } from "../shared/ids.js";
import { ProjectContextError } from "../shared/errors.js";

export interface TaskCheckpoint {
  summary?: string;
  completed: string[];
  next: string[];
  changedFiles: string[];
  verification: Array<{ command: string; status: string; summary?: string }>;
  blockers: string[];
  risks: string[];
}

export interface TaskRecord {
  id: string;
  goal: string;
  status: "in_progress" | "completed" | "cancelled";
  checkpoint: TaskCheckpoint;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

interface TaskRow {
  id: string; goal: string; status: TaskRecord["status"]; checkpoint_json: string;
  created_at: string; updated_at: string; completed_at: string | null;
}

const emptyCheckpoint = (): TaskCheckpoint => ({
  completed: [], next: [], changedFiles: [], verification: [], blockers: [], risks: [],
});

export function startTask(db: SqliteDatabase, goal: string): TaskRecord {
  const timestamp = nowIso();
  const task: TaskRecord = {
    id: createId("task"), goal: goal.trim(), status: "in_progress", checkpoint: emptyCheckpoint(),
    createdAt: timestamp, updatedAt: timestamp, completedAt: null,
  };
  if (!task.goal) throw new ProjectContextError("INVALID_TASK", "Task goal is required.");
  db.prepare(`
    INSERT INTO tasks (id, goal, status, checkpoint_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(task.id, task.goal, task.status, JSON.stringify(task.checkpoint), task.createdAt, task.updatedAt);
  return task;
}

export function checkpointTask(db: SqliteDatabase, taskId: string, checkpoint: TaskCheckpoint): TaskRecord {
  ensureTask(db, taskId);
  db.prepare("UPDATE tasks SET checkpoint_json = ?, updated_at = ? WHERE id = ?")
    .run(JSON.stringify(checkpoint), nowIso(), taskId);
  return getTask(db, taskId);
}

export function completeTask(db: SqliteDatabase, taskId: string, checkpoint?: TaskCheckpoint): TaskRecord {
  ensureTask(db, taskId);
  const timestamp = nowIso();
  if (checkpoint) {
    db.prepare(`
      UPDATE tasks SET status = 'completed', checkpoint_json = ?, updated_at = ?, completed_at = ? WHERE id = ?
    `).run(JSON.stringify(checkpoint), timestamp, timestamp, taskId);
  } else {
    db.prepare("UPDATE tasks SET status = 'completed', updated_at = ?, completed_at = ? WHERE id = ?")
      .run(timestamp, timestamp, taskId);
  }
  return getTask(db, taskId);
}

export function listTasks(db: SqliteDatabase, status = "in_progress", limit = 20): TaskRecord[] {
  return (db.prepare("SELECT * FROM tasks WHERE status = ? ORDER BY updated_at DESC LIMIT ?")
    .all(status, limit) as TaskRow[]).map(mapTask);
}

export function getTask(db: SqliteDatabase, taskId: string): TaskRecord {
  return mapTask(db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as TaskRow);
}

function ensureTask(db: SqliteDatabase, taskId: string): void {
  if (!db.prepare("SELECT id FROM tasks WHERE id = ?").get(taskId)) {
    throw new ProjectContextError("TASK_NOT_FOUND", `Unknown task: ${taskId}`);
  }
}

function mapTask(row: TaskRow): TaskRecord {
  return {
    id: row.id, goal: row.goal, status: row.status,
    checkpoint: JSON.parse(row.checkpoint_json) as TaskCheckpoint,
    createdAt: row.created_at, updatedAt: row.updated_at, completedAt: row.completed_at,
  };
}
