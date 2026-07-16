import type { SqliteDatabase } from "../storage/database.js";
import type { ProjectRecord } from "../projects/project-service.js";
import { listMemories, type MemoryRecord } from "../memory/memory-service.js";
import { listTasks, type TaskRecord } from "../tasks/task-service.js";
import { searchProject, type SearchHit } from "../search/search-service.js";
import type { UserMemoryRecord } from "../memory/user-memory-service.js";

export interface ProjectContext {
  project: Pick<ProjectRecord, "id" | "name" | "rootPath" | "remoteUrl">;
  task: string;
  constraints: MemoryRecord[];
  decisions: MemoryRecord[];
  lessons: MemoryRecord[];
  userMemories: UserMemoryRecord[];
  activeTasks: TaskRecord[];
  relevant: SearchHit[];
  codeRelations: Array<{
    from: string;
    to: string;
    type: string;
    source: string;
    line: number;
  }>;
  warnings: string[];
  budget: { requestedTokens: number; usedTokens: number; truncated: boolean };
}

export function buildProjectContext(
  db: SqliteDatabase,
  project: ProjectRecord,
  task: string,
  budgetTokens = 8_000,
  userMemories: UserMemoryRecord[] = [],
): ProjectContext {
  const memories = listMemories(db, "active", 200);
  const relevant = searchProject(db, task, 30);
  const relevantMemoryIds = new Set(relevant.filter((hit) => hit.kind === "memory").map((hit) => hit.id));
  const taskTokens = tokens(task);
  const rankMemory = (memory: MemoryRecord): number =>
    (relevantMemoryIds.has(memory.id) ? 100 : 0)
    + taskTokens.filter((token) => `${memory.title} ${memory.content} ${memory.scope.join(" ")}`.toLowerCase().includes(token)).length;
  const ranked = [...memories].sort((a, b) => rankMemory(b) - rankMemory(a));
  const staleCount = count(db, "SELECT COUNT(*) AS count FROM memories WHERE status IN ('stale', 'conflicted')");
  const failedIndexCount = count(db, "SELECT COUNT(*) AS count FROM index_runs WHERE status = 'failed'");
  const warnings: string[] = [];
  if (staleCount > 0) warnings.push(`${staleCount} memories are stale or conflicted and require review.`);
  if (failedIndexCount > 0) warnings.push(`${failedIndexCount} index runs failed; project search may be incomplete.`);

  const context: ProjectContext = {
    project: { id: project.id, name: project.name, rootPath: project.rootPath, remoteUrl: project.remoteUrl },
    task,
    constraints: ranked.filter((memory) => (
      memory.type === "constraint" && (memory.scope.length === 0 || rankMemory(memory) > 0)
    )).slice(0, 20),
    decisions: ranked.filter((memory) => memory.type === "decision" && rankMemory(memory) > 0).slice(0, 15),
    lessons: ranked.filter(
      (memory) => (memory.type === "lesson" || memory.type === "issue") && rankMemory(memory) > 0,
    ).slice(0, 10),
    userMemories: rankUserMemories(userMemories, task).slice(0, 50),
    activeTasks: listTasks(db, "in_progress", 10),
    relevant,
    codeRelations: relatedCode(db, relevant),
    warnings,
    budget: { requestedTokens: budgetTokens, usedTokens: 0, truncated: false },
  };
  return fitBudget(context);
}

function fitBudget(context: ProjectContext): ProjectContext {
  const copy: ProjectContext = structuredClone(context);
  copy.budget.usedTokens = estimateTokens(JSON.stringify(copy));
  if (copy.budget.usedTokens <= copy.budget.requestedTokens) return copy;
  copy.budget.truncated = true;
  for (const items of [
    copy.relevant, copy.codeRelations, copy.lessons, copy.decisions,
    copy.constraints, copy.userMemories, copy.activeTasks,
  ]) {
    while (copy.budget.usedTokens > copy.budget.requestedTokens && items.length > 1) {
      items.pop();
      copy.budget.usedTokens = estimateTokens(JSON.stringify(copy));
    }
  }
  while (copy.budget.usedTokens > copy.budget.requestedTokens) {
    const target = longestTruncatableString(copy);
    if (!target || target.value.length <= 32) break;
    target.set(`${target.value.slice(0, Math.max(16, Math.floor(target.value.length * 0.7)))}...`);
    copy.budget.usedTokens = estimateTokens(JSON.stringify(copy));
  }
  if (copy.budget.usedTokens > copy.budget.requestedTokens) {
    copy.relevant = [];
    copy.codeRelations = [];
    copy.lessons = [];
    copy.decisions = [];
    copy.constraints = [];
    copy.userMemories = [];
    copy.activeTasks = [];
    copy.warnings.push("Context details were removed to satisfy the requested token budget.");
    copy.budget.usedTokens = estimateTokens(JSON.stringify(copy));
  }
  return copy;
}

function estimateTokens(value: string): number {
  let cjk = 0;
  for (const character of value) {
    if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(character)) cjk += 1;
  }
  return Math.ceil(cjk + (value.length - cjk) / 4);
}

function longestTruncatableString(context: ProjectContext): {
  value: string;
  set: (value: string) => void;
} | null {
  const candidates: Array<{ value: string; set: (value: string) => void }> = [];
  for (const hit of context.relevant) {
    candidates.push({ value: hit.content, set: (value) => { hit.content = value; } });
  }
  for (const memory of [...context.constraints, ...context.decisions, ...context.lessons]) {
    candidates.push({ value: memory.content, set: (value) => { memory.content = value; } });
    if (memory.reason) candidates.push({ value: memory.reason, set: (value) => { memory.reason = value; } });
  }
  for (const memory of context.userMemories) {
    candidates.push({ value: memory.content, set: (value) => { memory.content = value; } });
    if (memory.reason) candidates.push({ value: memory.reason, set: (value) => { memory.reason = value; } });
  }
  for (const task of context.activeTasks) {
    candidates.push({ value: task.goal, set: (value) => { task.goal = value; } });
    if (task.checkpoint.summary) {
      candidates.push({ value: task.checkpoint.summary, set: (value) => { task.checkpoint.summary = value; } });
    }
    for (const values of [
      task.checkpoint.completed, task.checkpoint.next, task.checkpoint.changedFiles,
      task.checkpoint.blockers, task.checkpoint.risks,
    ]) {
      values.forEach((value, index) => candidates.push({ value, set: (next) => { values[index] = next; } }));
    }
  }
  return candidates.sort((a, b) => b.value.length - a.value.length)[0] ?? null;
}

function relatedCode(db: SqliteDatabase, hits: SearchHit[]): ProjectContext["codeRelations"] {
  const symbolIds = hits.filter((hit) => hit.kind === "symbol").map((hit) => hit.id).slice(0, 20);
  if (symbolIds.length === 0) return [];
  const placeholders = symbolIds.map(() => "?").join(", ");
  return db.prepare(`
    SELECT from_name, to_name, relation_type, source_path, start_line
    FROM relations WHERE from_symbol_id IN (${placeholders})
    ORDER BY source_path, start_line LIMIT 100
  `).all(...symbolIds).map((row) => {
    const item = row as {
      from_name: string; to_name: string; relation_type: string; source_path: string; start_line: number;
    };
    return {
      from: item.from_name, to: item.to_name, type: item.relation_type,
      source: item.source_path, line: item.start_line,
    };
  });
}

function tokens(value: string): string[] {
  return value.toLowerCase().split(/[^\p{L}\p{N}_-]+/u).filter((token) => token.length >= 2);
}

function rankUserMemories(memories: UserMemoryRecord[], task: string): UserMemoryRecord[] {
  const taskTokens = tokens(task);
  const score = (memory: UserMemoryRecord): number => {
    const text = `${memory.title} ${memory.content} ${memory.scopeRef ?? ""}`.toLowerCase();
    const relevance = taskTokens.filter((token) => text.includes(token)).length;
    const scopeWeight = memory.scopeLevel === "user" ? 1 : 10;
    const constraintWeight = memory.type === "constraint" ? 5 : 0;
    return relevance * 100 + scopeWeight + constraintWeight;
  };
  return [...memories].sort((a, b) => score(b) - score(a));
}

function count(db: SqliteDatabase, sql: string): number {
  return (db.prepare(sql).get() as { count: number }).count;
}
