import { extname, basename } from "node:path";

export const DEFAULT_IGNORE_PATTERNS = [
  ".git/",
  ".hg/",
  ".svn/",
  ".project-context/",
  "node_modules/",
  "dist/",
  "build/",
  "coverage/",
  ".next/",
  ".cache/",
  ".venv/",
  "venv/",
  "__pycache__/",
  "vendor/",
  "*.min.js",
  "*.min.css",
  "*.map",
  "*.lock",
  "package-lock.json",
];

const CODEX_RUNTIME_IGNORE_PATTERNS = [
  ".sandbox/",
  ".sandbox-bin/",
  ".sandbox-secrets/",
  ".tmp/",
  "attachments/",
  "browser/",
  "computer-use/",
  "computer-use-turn-ended/",
  "generated_images/",
  "log/",
  "logs/",
  "mcp-oauth-locks/",
  "node_repl/",
  "plugins/cache/",
  "process_manager/",
  "secrets/",
  "sessions/",
  "sqlite/",
  "tmp/",
  "vendor_imports/",
  "*.jsonl",
  "*.sqlite-*",
  ".codex-global-state.json*",
  "cap_sid",
  "models_cache.json",
];

export function defaultIgnorePatterns(rootPath: string): string[] {
  return basename(rootPath).toLowerCase() === ".codex"
    ? [...DEFAULT_IGNORE_PATTERNS, ...CODEX_RUNTIME_IGNORE_PATTERNS]
    : DEFAULT_IGNORE_PATTERNS;
}

const secretNames = new Set([
  ".env",
  ".npmrc",
  ".pypirc",
  "auth.json",
  "credentials.json",
  "secrets.json",
  "id_rsa",
  "id_ed25519",
]);

const secretExtensions = new Set([".pem", ".key", ".p12", ".pfx", ".jks", ".keystore"]);
const binaryExtensions = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz", ".7z",
  ".exe", ".dll", ".so", ".dylib", ".wasm", ".db", ".sqlite", ".sqlite3", ".woff", ".woff2",
]);

export function isSensitivePath(relativePath: string): boolean {
  const name = basename(relativePath).toLowerCase();
  const extension = extname(name);
  return secretNames.has(name)
    || name.startsWith(".env.")
    || secretExtensions.has(extension)
    || relativePath.toLowerCase().includes("/.ssh/");
}

export function isCandidateTextFile(relativePath: string): boolean {
  return !binaryExtensions.has(extname(relativePath).toLowerCase());
}

export function detectKind(relativePath: string): string {
  const extension = extname(relativePath).toLowerCase();
  if ([".md", ".mdx", ".rst", ".txt"].includes(extension)) return "document";
  if ([".json", ".jsonc", ".yaml", ".yml", ".toml", ".ini", ".xml"].includes(extension)) return "config";
  return "code";
}

export function containsLikelySecret(content: string): boolean {
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)) return true;
  return /(?:api[_-]?key|access[_-]?token|client[_-]?secret|private[_-]?key|password)\s*[:=]\s*["']?[A-Za-z0-9_\-/.+=]{16,}/i
    .test(content);
}
