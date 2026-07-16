import type { SqliteDatabase } from "../storage/database.js";
import { matchingNgramItems, type SearchItemKind } from "./ngram-index.js";

export interface SearchHit {
  kind: "chunk" | "memory" | "symbol";
  id: string;
  title: string;
  content: string;
  source: string | null;
  startLine: number | null;
  score: number;
  status: string | null;
}

export function searchProject(db: SqliteDatabase, query: string, limit = 20): SearchHit[] {
  const ftsQuery = toFtsQuery(query);
  if (!ftsQuery) return [];
  const perKind = Math.max(limit, 5);
  const chunks = db.prepare(`
    SELECT c.id, c.source_path, c.content, c.start_line, bm25(chunks_fts, 0, 2, 1) AS rank
    FROM chunks_fts
    JOIN chunks c ON c.id = chunks_fts.chunk_id
    WHERE chunks_fts MATCH ?
    ORDER BY rank LIMIT ?
  `).all(ftsQuery, perKind) as Array<{
    id: string; source_path: string; content: string; start_line: number; rank: number;
  }>;
  const memories = db.prepare(`
    SELECT m.id, m.title, m.content, m.source_ref, m.status, bm25(memories_fts, 0, 2, 1, 0.5) AS rank
    FROM memories_fts
    JOIN memories m ON m.id = memories_fts.memory_id
    WHERE memories_fts MATCH ? AND m.status = 'active'
    ORDER BY rank LIMIT ?
  `).all(ftsQuery, perKind) as Array<{
    id: string; title: string; content: string; source_ref: string | null; status: string; rank: number;
  }>;
  const symbols = db.prepare(`
    SELECT s.id, s.name, s.qualified_name, s.kind, s.signature, s.source_path, s.start_line,
           bm25(symbols_fts, 0, 5, 2, 1) AS rank
    FROM symbols_fts
    JOIN symbols s ON s.id = symbols_fts.symbol_id
    WHERE symbols_fts MATCH ?
    ORDER BY rank LIMIT ?
  `).all(ftsQuery, perKind) as Array<{
    id: string; name: string; qualified_name: string; kind: string; signature: string | null;
    source_path: string; start_line: number; rank: number;
  }>;

  const exact = [
    ...symbols.map((row): SearchHit => ({
      kind: "symbol", id: row.id, title: `${row.kind} ${row.qualified_name}`,
      content: row.signature ?? row.name, source: row.source_path, startLine: row.start_line,
      score: normalizeRank(row.rank) + 0.25, status: null,
    })),
    ...chunks.map((row): SearchHit => ({
      kind: "chunk", id: row.id, title: row.source_path, content: row.content,
      source: row.source_path, startLine: row.start_line, score: normalizeRank(row.rank), status: null,
    })),
    ...memories.map((row): SearchHit => ({
      kind: "memory", id: row.id, title: row.title, content: row.content,
      source: row.source_ref, startLine: null, score: normalizeRank(row.rank), status: row.status,
    })),
  ].sort((a, b) => b.score - a.score);
  const fuzzy = matchingNgramItems(db, query, Math.max(limit * 4, 20))
    .map((item) => ngramHit(db, item.kind, item.id, item.coverage, query))
    .filter((hit): hit is SearchHit => hit !== null);
  const lexicalById = new Map(exact.map((hit) => [hit.id, hit]));
  for (const hit of fuzzy) {
    const existing = lexicalById.get(hit.id);
    if (!existing || hit.score > existing.score) lexicalById.set(hit.id, hit);
  }
  const lexical = [...lexicalById.values()];
  const lexicalIds = new Set(lexical.map((hit) => hit.id));
  const related = graphRelatedHits(db, lexical)
    .filter((hit) => !lexicalIds.has(hit.id));
  return [...lexical, ...related].sort((a, b) => b.score - a.score).slice(0, limit);
}

function graphRelatedHits(db: SqliteDatabase, hits: SearchHit[]): SearchHit[] {
  const symbolIds = hits.filter((hit) => hit.kind === "symbol").map((hit) => hit.id).slice(0, 20);
  if (symbolIds.length === 0) return [];
  const placeholders = symbolIds.map(() => "?").join(", ");
  const rows = db.prepare(`
    SELECT DISTINCT target.id
    FROM relations relation
    JOIN symbols source ON source.id = relation.from_symbol_id
    JOIN symbols target ON target.name = relation.to_name
    WHERE source.id IN (${placeholders})
    UNION
    SELECT DISTINCT source.id
    FROM relations relation
    JOIN symbols source ON source.id = relation.from_symbol_id
    JOIN symbols target ON target.name = relation.to_name
    WHERE target.id IN (${placeholders})
    LIMIT 40
  `).all(...symbolIds, ...symbolIds) as Array<{ id: string }>;
  return rows.map((row) => ngramHit(db, "symbol", row.id, 0, ""))
    .filter((hit): hit is SearchHit => hit !== null)
    .map((hit) => ({ ...hit, score: 0.3 }));
}

function ngramHit(
  db: SqliteDatabase,
  kind: SearchItemKind,
  id: string,
  coverage: number,
  query: string,
): SearchHit | null {
  const score = 0.25 + Math.min(1, coverage) * 0.6;
  if (kind === "chunk") {
    const row = db.prepare("SELECT source_path, content, start_line FROM chunks WHERE id = ?").get(id) as
      { source_path: string; content: string; start_line: number } | undefined;
    return row ? {
      kind, id, title: row.source_path, content: row.content, source: row.source_path,
      startLine: row.start_line, score, status: null,
    } : null;
  }
  if (kind === "symbol") {
    const row = db.prepare(
      "SELECT name, qualified_name, kind, signature, source_path, start_line FROM symbols WHERE id = ?",
    ).get(id) as {
      name: string; qualified_name: string; kind: string; signature: string | null;
      source_path: string; start_line: number;
    } | undefined;
    return row ? {
      kind, id, title: `${row.kind} ${row.qualified_name}`, content: row.signature ?? row.name,
      source: row.source_path,
      startLine: row.start_line,
      score: Math.min(1, score + (normalizedIdentifier(row.name) === normalizedIdentifier(query) ? 0.25 : 0.05)),
      status: null,
    } : null;
  }
  const row = db.prepare(`
    SELECT title, content, source_ref, status FROM memories
    WHERE id = ? AND status = 'active'
  `).get(id) as { title: string; content: string; source_ref: string | null; status: string } | undefined;
  return row ? {
    kind, id, title: row.title, content: row.content, source: row.source_ref,
    startLine: null, score, status: row.status,
  } : null;
}

function normalizedIdentifier(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}_]/gu, "");
}

function toFtsQuery(query: string): string {
  return query
    .trim()
    .split(/\s+/)
    .map((token) => token.replaceAll('"', '""').replace(/[^\p{L}\p{N}_-]/gu, ""))
    .filter(Boolean)
    .map((token) => `"${token}"`)
    .join(" OR ");
}

function normalizeRank(rank: number): number {
  return 1 / (1 + Math.abs(rank));
}
