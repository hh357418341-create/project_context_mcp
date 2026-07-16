import { basename, extname, posix } from "node:path";
import type { SqliteDatabase } from "../storage/database.js";
import { ProjectContextError } from "../shared/errors.js";

export const GRAPH_RELATION_TYPES = ["IMPORTS", "CALLS", "EXTENDS", "IMPLEMENTS"] as const;
export type GraphRelationType = typeof GRAPH_RELATION_TYPES[number];

export interface GraphOptions {
  relationTypes?: GraphRelationType[];
  limit?: number;
}

interface SymbolRow {
  id: string;
  sourcePath: string;
  name: string;
  qualifiedName: string;
  kind: string;
  signature: string | null;
  startLine: number;
  endLine: number;
}

interface RelationRow {
  id: string;
  sourcePath: string;
  fromSymbolId: string | null;
  fromName: string;
  toName: string;
  relationType: GraphRelationType;
  startLine: number;
  evidence: string | null;
}

interface SourceRow {
  path: string;
  kind: string;
  sizeBytes: number;
  indexedAt: string;
}

interface ResolvedRelation extends RelationRow {
  targetSymbolId: string | null;
  targetSourcePath: string | null;
}

export function graphOverview(db: SqliteDatabase, options: GraphOptions = {}): Record<string, unknown> {
  const index = loadIndex(db);
  const allowed = relationFilter(options.relationTypes);
  const limit = clamp(options.limit ?? 80, 10, 120);
  const symbolCounts = countBy(index.symbols, (symbol) => symbol.sourcePath);
  const relationCounts = countBy(index.relations, (relation) => relation.relationType);
  const edgeMap = new Map<string, {
    id: string; source: string; target: string; relationType: GraphRelationType; count: number;
  }>();
  const degrees = new Map<string, number>();

  for (const relation of resolveRelations(index)) {
    if (!allowed.has(relation.relationType)) continue;
    const targetPath = relation.targetSourcePath ?? resolveImportPath(relation, index.sourcePaths);
    if (!targetPath || targetPath === relation.sourcePath) continue;
    const source = fileNodeId(relation.sourcePath);
    const target = fileNodeId(targetPath);
    const key = `${source}\n${target}\n${relation.relationType}`;
    const edge = edgeMap.get(key) ?? {
      id: `file-edge:${edgeMap.size}`, source, target, relationType: relation.relationType, count: 0,
    };
    edge.count += 1;
    edgeMap.set(key, edge);
    degrees.set(relation.sourcePath, (degrees.get(relation.sourcePath) ?? 0) + 1);
    degrees.set(targetPath, (degrees.get(targetPath) ?? 0) + 1);
  }

  const selectedPaths = [...index.sources]
    .sort((left, right) => (degrees.get(right.path) ?? 0) - (degrees.get(left.path) ?? 0)
      || (symbolCounts.get(right.path) ?? 0) - (symbolCounts.get(left.path) ?? 0)
      || left.path.localeCompare(right.path))
    .slice(0, limit)
    .map((source) => source.path);
  const selected = new Set(selectedPaths);
  const nodes = selectedPaths.map((path) => {
    const source = index.sourceByPath.get(path)!;
    return {
      id: fileNodeId(path), label: basename(path), nodeType: "file", path,
      sourceKind: source.kind, sizeBytes: source.sizeBytes,
      symbolCount: symbolCounts.get(path) ?? 0, relationCount: degrees.get(path) ?? 0,
    };
  });
  const edges = [...edgeMap.values()]
    .filter((edge) => selected.has(filePathFromNodeId(edge.source)) && selected.has(filePathFromNodeId(edge.target)))
    .sort((left, right) => right.count - left.count)
    .slice(0, 400);

  return {
    mode: "files",
    nodes,
    edges,
    relationTypes: GRAPH_RELATION_TYPES.map((type) => ({ type, count: relationCounts.get(type) ?? 0 })),
    totals: { nodes: index.sources.length, edges: edgeMap.size },
    truncated: nodes.length < index.sources.length || edges.length < edgeMap.size,
  };
}

export function graphNeighbors(
  db: SqliteDatabase,
  nodeId: string,
  options: GraphOptions & { depth?: number } = {},
): Record<string, unknown> {
  const index = loadIndex(db);
  const allowed = relationFilter(options.relationTypes);
  const limit = clamp(options.limit ?? 100, 10, 150);
  const depth = clamp(options.depth ?? 1, 1, 2);
  const relations = resolveRelations(index).filter((relation) => allowed.has(relation.relationType)
    && relation.fromSymbolId && relation.targetSymbolId);
  const degree = new Map<string, number>();
  for (const relation of relations) {
    degree.set(relation.fromSymbolId!, (degree.get(relation.fromSymbolId!) ?? 0) + 1);
    degree.set(relation.targetSymbolId!, (degree.get(relation.targetSymbolId!) ?? 0) + 1);
  }

  let seeds: string[];
  if (nodeId.startsWith("file:")) {
    const path = filePathFromNodeId(nodeId);
    if (!index.sourceByPath.has(path)) throw new ProjectContextError("GRAPH_NODE_NOT_FOUND", `Unknown graph file: ${path}`);
    seeds = index.symbols.filter((symbol) => symbol.sourcePath === path)
      .sort((left, right) => (degree.get(right.id) ?? 0) - (degree.get(left.id) ?? 0))
      .slice(0, Math.min(30, limit)).map((symbol) => symbol.id);
  } else {
    if (!index.symbolById.has(nodeId)) throw new ProjectContextError("GRAPH_NODE_NOT_FOUND", `Unknown graph symbol: ${nodeId}`);
    seeds = [nodeId];
  }

  const selected = new Set(seeds);
  let frontier = new Set(seeds);
  for (let level = 0; level < depth && frontier.size && selected.size < limit; level += 1) {
    const next = new Set<string>();
    for (const relation of relations) {
      const source = relation.fromSymbolId!;
      const target = relation.targetSymbolId!;
      if (!frontier.has(source) && !frontier.has(target)) continue;
      for (const id of [source, target]) {
        if (selected.size >= limit) break;
        if (!selected.has(id)) { selected.add(id); next.add(id); }
      }
    }
    frontier = next;
  }

  const nodes = [...selected].flatMap((id) => {
    const symbol = index.symbolById.get(id);
    return symbol ? [symbolNode(symbol, degree.get(id) ?? 0)] : [];
  });
  const edges = relations.filter((relation) => selected.has(relation.fromSymbolId!) && selected.has(relation.targetSymbolId!))
    .slice(0, 500).map((relation) => ({
      id: relation.id, source: relation.fromSymbolId, target: relation.targetSymbolId,
      relationType: relation.relationType, count: 1, evidence: relation.evidence, line: relation.startLine,
    }));
  return {
    mode: "symbols", root: nodeId, nodes, edges,
    relationTypes: GRAPH_RELATION_TYPES.map((type) => ({ type, count: relations.filter((item) => item.relationType === type).length })),
    truncated: selected.size >= limit,
  };
}

export function graphSearch(db: SqliteDatabase, query: string, limit = 20): Record<string, unknown> {
  const normalized = query.trim();
  if (!normalized) return { results: [] };
  const pattern = `%${escapeLike(normalized)}%`;
  const symbols = db.prepare(`
    SELECT id, source_path AS sourcePath, name, qualified_name AS qualifiedName, kind,
           signature, start_line AS startLine, end_line AS endLine
    FROM symbols
    WHERE name LIKE ? ESCAPE '\\' OR qualified_name LIKE ? ESCAPE '\\'
    ORDER BY CASE WHEN name = ? THEN 0 WHEN name LIKE ? ESCAPE '\\' THEN 1 ELSE 2 END, name
    LIMIT ?
  `).all(pattern, pattern, normalized, `${escapeLike(normalized)}%`, limit) as SymbolRow[];
  const remaining = Math.max(0, limit - symbols.length);
  const sources = remaining ? db.prepare(`
    SELECT path, kind, size_bytes AS sizeBytes, indexed_at AS indexedAt
    FROM sources WHERE path LIKE ? ESCAPE '\\' ORDER BY path LIMIT ?
  `).all(pattern, remaining) as SourceRow[] : [];
  return {
    results: [
      ...symbols.map((symbol) => ({ id: symbol.id, label: symbol.name, nodeType: "symbol", kind: symbol.kind, path: symbol.sourcePath })),
      ...sources.map((source) => ({ id: fileNodeId(source.path), label: basename(source.path), nodeType: "file", kind: source.kind, path: source.path })),
    ],
  };
}

export function graphNodeDetails(db: SqliteDatabase, nodeId: string): Record<string, unknown> {
  if (nodeId.startsWith("file:")) {
    const path = filePathFromNodeId(nodeId);
    const source = db.prepare(`
      SELECT path, kind, size_bytes AS sizeBytes, indexed_at AS indexedAt
      FROM sources WHERE path = ?
    `).get(path) as SourceRow | undefined;
    if (!source) throw new ProjectContextError("GRAPH_NODE_NOT_FOUND", `Unknown graph file: ${path}`);
    const symbols = db.prepare(`
      SELECT id, name, kind, signature, start_line AS startLine, end_line AS endLine
      FROM symbols WHERE source_path = ? ORDER BY start_line LIMIT 30
    `).all(path);
    return {
      id: nodeId, nodeType: "file", label: basename(path), path, sourceKind: source.kind,
      sizeBytes: source.sizeBytes, indexedAt: source.indexedAt,
      symbolCount: scalar(db, "SELECT COUNT(*) FROM symbols WHERE source_path = ?", path),
      relationCount: scalar(db, "SELECT COUNT(*) FROM relations WHERE source_path = ?", path),
      symbols,
    };
  }
  const symbol = db.prepare(`
    SELECT id, source_path AS sourcePath, name, qualified_name AS qualifiedName, kind,
           signature, start_line AS startLine, end_line AS endLine
    FROM symbols WHERE id = ?
  `).get(nodeId) as SymbolRow | undefined;
  if (!symbol) throw new ProjectContextError("GRAPH_NODE_NOT_FOUND", `Unknown graph symbol: ${nodeId}`);
  const outgoing = db.prepare(`
    SELECT id, to_name AS toName, relation_type AS relationType, start_line AS startLine, evidence
    FROM relations WHERE from_symbol_id = ? ORDER BY start_line LIMIT 20
  `).all(nodeId);
  const incoming = db.prepare(`
    SELECT id, from_name AS fromName, relation_type AS relationType, source_path AS sourcePath,
           start_line AS startLine, evidence
    FROM relations WHERE to_name = ? OR to_name = ? ORDER BY source_path, start_line LIMIT 20
  `).all(symbol.name, symbol.qualifiedName);
  return { ...symbol, nodeType: "symbol", label: symbol.name, outgoing, incoming };
}

function loadIndex(db: SqliteDatabase) {
  const sources = db.prepare(`
    SELECT path, kind, size_bytes AS sizeBytes, indexed_at AS indexedAt FROM sources ORDER BY path
  `).all() as SourceRow[];
  const symbols = db.prepare(`
    SELECT id, source_path AS sourcePath, name, qualified_name AS qualifiedName, kind,
           signature, start_line AS startLine, end_line AS endLine FROM symbols
  `).all() as SymbolRow[];
  const relations = db.prepare(`
    SELECT id, source_path AS sourcePath, from_symbol_id AS fromSymbolId, from_name AS fromName,
           to_name AS toName, relation_type AS relationType, start_line AS startLine, evidence
    FROM relations
  `).all() as RelationRow[];
  const symbolById = new Map(symbols.map((symbol) => [symbol.id, symbol]));
  const symbolsByName = new Map<string, SymbolRow[]>();
  const symbolByQualifiedName = new Map(symbols.map((symbol) => [symbol.qualifiedName, symbol]));
  for (const symbol of symbols) {
    const bucket = symbolsByName.get(symbol.name) ?? [];
    bucket.push(symbol); symbolsByName.set(symbol.name, bucket);
  }
  const sourceByPath = new Map(sources.map((source) => [source.path, source]));
  return { sources, symbols, relations, symbolById, symbolsByName, symbolByQualifiedName, sourceByPath, sourcePaths: new Set(sourceByPath.keys()) };
}

function resolveRelations(index: ReturnType<typeof loadIndex>): ResolvedRelation[] {
  return index.relations.map((relation) => {
    const from = relation.fromSymbolId ? index.symbolById.get(relation.fromSymbolId) : undefined;
    const shortName = relation.toName.split(/[.#]/).at(-1) ?? relation.toName;
    const candidates = index.symbolsByName.get(shortName) ?? [];
    const target = index.symbolByQualifiedName.get(relation.toName)
      ?? candidates.find((symbol) => symbol.sourcePath === relation.sourcePath)
      ?? (candidates.length === 1 ? candidates[0] : undefined);
    return {
      ...relation,
      sourcePath: from?.sourcePath ?? relation.sourcePath,
      targetSymbolId: target?.id ?? null,
      targetSourcePath: target?.sourcePath ?? null,
    };
  });
}

function resolveImportPath(relation: RelationRow, sourcePaths: Set<string>): string | null {
  if (relation.relationType !== "IMPORTS" || !relation.toName.startsWith(".")) return null;
  const base = posix.normalize(posix.join(posix.dirname(relation.sourcePath.replaceAll("\\", "/")), relation.toName));
  const withoutExtension = extname(base) ? base.slice(0, -extname(base).length) : base;
  for (const candidate of [base, withoutExtension, ...[".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].flatMap((extension) => [
    `${withoutExtension}${extension}`, `${withoutExtension}/index${extension}`,
  ])]) {
    if (sourcePaths.has(candidate)) return candidate;
  }
  return null;
}

function relationFilter(types?: GraphRelationType[]): Set<GraphRelationType> {
  return new Set(types?.length ? types : GRAPH_RELATION_TYPES);
}

function symbolNode(symbol: SymbolRow, relationCount: number) {
  return {
    id: symbol.id, label: symbol.name, nodeType: "symbol", kind: symbol.kind,
    path: symbol.sourcePath, qualifiedName: symbol.qualifiedName, signature: symbol.signature,
    startLine: symbol.startLine, endLine: symbol.endLine, relationCount,
  };
}

function fileNodeId(path: string): string { return `file:${path}`; }
function filePathFromNodeId(id: string): string { return id.slice("file:".length); }
function clamp(value: number, minimum: number, maximum: number): number { return Math.max(minimum, Math.min(maximum, value)); }
function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) { const value = key(item); counts.set(value, (counts.get(value) ?? 0) + 1); }
  return counts;
}
function escapeLike(value: string): string { return value.replace(/[\\%_]/g, (character) => `\\${character}`); }
function scalar(db: SqliteDatabase, sql: string, ...parameters: unknown[]): number {
  return (db.prepare(sql).pluck().get(...parameters) as number | undefined) ?? 0;
}
