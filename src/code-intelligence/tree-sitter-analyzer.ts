import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import JavaScript from "tree-sitter-javascript";
import { extname } from "node:path";
import { sha256 } from "../shared/ids.js";

export interface CodeSymbol {
  id: string;
  name: string;
  qualifiedName: string;
  kind: string;
  signature: string | null;
  startLine: number;
  endLine: number;
  contentHash: string;
}

export interface CodeRelation {
  id: string;
  fromSymbolId: string | null;
  fromName: string;
  toName: string;
  relationType: "IMPORTS" | "CALLS" | "EXTENDS" | "IMPLEMENTS";
  startLine: number;
  evidence: string | null;
}

export interface CodeAnalysis {
  language: "typescript" | "tsx" | "javascript" | "jsx";
  symbols: CodeSymbol[];
  relations: CodeRelation[];
}

const parser = new Parser();
const DIRECT_PARSE_LIMIT = 32_768;
const PARSE_CHUNK_SIZE = 8_192;

export function analyzeCode(sourcePath: string, content: string): CodeAnalysis | null {
  const language = languageForPath(sourcePath);
  if (!language) return null;
  parser.setLanguage(language.grammar);
  // The current Node binding rejects direct string inputs at 32,768 characters.
  const tree = content.length < DIRECT_PARSE_LIMIT
    ? parser.parse(content)
    : parser.parse((index) => content.slice(index, index + PARSE_CHUNK_SIZE));
  const symbols: CodeSymbol[] = [];
  const relations: CodeRelation[] = [];
  visit(tree.rootNode, null, [], sourcePath, symbols, relations, `${sourcePath}#module`);
  return { language: language.name, symbols, relations };
}

function visit(
  node: Parser.SyntaxNode,
  currentSymbol: CodeSymbol | null,
  containers: string[],
  sourcePath: string,
  symbols: CodeSymbol[],
  relations: CodeRelation[],
  moduleName: string,
): void {
  const created = symbolFromNode(node, sourcePath, containers);
  let nextSymbol = currentSymbol;
  let nextContainers = containers;
  if (created) {
    symbols.push(created);
    nextSymbol = created;
    if (["class", "interface", "enum"].includes(created.kind)) nextContainers = [...containers, created.name];
    addHeritageRelations(node, created, sourcePath, relations);
  }

  if (node.type === "import_statement") {
    const target = node.namedChildren.find((child) => child.type === "string")?.text.replace(/^['"]|['"]$/g, "");
    if (target) relations.push(relation(sourcePath, nextSymbol, moduleName, target, "IMPORTS", node));
  }
  if (node.type === "call_expression") {
    const target = node.childForFieldName("function")?.text;
    if (target) relations.push(relation(sourcePath, nextSymbol, moduleName, target, "CALLS", node));
  }

  for (const child of node.namedChildren) {
    visit(child, nextSymbol, nextContainers, sourcePath, symbols, relations, moduleName);
  }
}

function symbolFromNode(node: Parser.SyntaxNode, sourcePath: string, containers: string[]): CodeSymbol | null {
  let kind: string | null = null;
  let nameNode: Parser.SyntaxNode | null = null;
  switch (node.type) {
    case "function_declaration": kind = "function"; nameNode = node.childForFieldName("name"); break;
    case "class_declaration": kind = "class"; nameNode = node.childForFieldName("name"); break;
    case "interface_declaration": kind = "interface"; nameNode = node.childForFieldName("name"); break;
    case "type_alias_declaration": kind = "type"; nameNode = node.childForFieldName("name"); break;
    case "enum_declaration": kind = "enum"; nameNode = node.childForFieldName("name"); break;
    case "method_definition": kind = "method"; nameNode = node.childForFieldName("name"); break;
    case "variable_declarator": {
      const value = node.childForFieldName("value");
      if (value && ["arrow_function", "function_expression"].includes(value.type)) {
        kind = "function";
        nameNode = node.childForFieldName("name");
      }
      break;
    }
  }
  const name = nameNode?.text;
  if (!kind || !name) return null;
  const qualifiedName = [sourcePath, ...containers, name].join("#");
  return {
    id: `sym_${sha256(`${qualifiedName}:${node.startPosition.row + 1}:${node.startPosition.column}`).slice(0, 24)}`,
    name,
    qualifiedName,
    kind,
    signature: signatureFor(node),
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
    contentHash: sha256(node.text),
  };
}

function addHeritageRelations(
  node: Parser.SyntaxNode,
  symbol: CodeSymbol,
  sourcePath: string,
  relations: CodeRelation[],
): void {
  const heritage = node.namedChildren.find((child) => child.type === "class_heritage");
  if (!heritage) return;
  for (const clause of heritage.namedChildren) {
    const relationType = clause.type.includes("implements") ? "IMPLEMENTS" : "EXTENDS";
    const targets = clause.descendantsOfType(["identifier", "type_identifier", "nested_type_identifier"]);
    for (const target of targets) {
      relations.push(relation(sourcePath, symbol, symbol.qualifiedName, target.text, relationType, clause));
    }
  }
}

function relation(
  sourcePath: string,
  symbol: CodeSymbol | null,
  fallbackFrom: string,
  toName: string,
  relationType: CodeRelation["relationType"],
  node: Parser.SyntaxNode,
): CodeRelation {
  const fromName = symbol?.qualifiedName ?? fallbackFrom;
  return {
    id: `rel_${sha256(`${sourcePath}:${fromName}:${toName}:${relationType}:${node.startPosition.row}:${node.startPosition.column}`).slice(0, 24)}`,
    fromSymbolId: symbol?.id ?? null,
    fromName,
    toName: toName.slice(0, 500),
    relationType,
    startLine: node.startPosition.row + 1,
    evidence: node.text.slice(0, 500),
  };
}

function signatureFor(node: Parser.SyntaxNode): string | null {
  const body = node.childForFieldName("body");
  const text = body
    ? node.text.slice(0, Math.max(0, body.startIndex - node.startIndex)).trim()
    : node.text.split(/\r?\n/, 1)[0]?.trim();
  return text ? text.slice(0, 1_000) : null;
}

function languageForPath(path: string): { name: CodeAnalysis["language"]; grammar: unknown } | null {
  switch (extname(path).toLowerCase()) {
    case ".ts": return { name: "typescript", grammar: TypeScript.typescript };
    case ".tsx": return { name: "tsx", grammar: TypeScript.tsx };
    case ".js": case ".mjs": case ".cjs": return { name: "javascript", grammar: JavaScript };
    case ".jsx": return { name: "jsx", grammar: JavaScript };
    default: return null;
  }
}
