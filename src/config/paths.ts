import { homedir, tmpdir } from "node:os";
import { delimiter, dirname, isAbsolute, join, normalize, resolve } from "node:path";
import { access, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { z } from "zod/v4";
import { ProjectContextError } from "../shared/errors.js";

const storedConfigSchema = z.union([z.object({
  version: z.literal(1),
  storageRoot: z.string().min(1),
}), z.object({
  version: z.literal(2),
  storageRoot: z.string().min(1),
  allowedProjectRoots: z.array(z.string()).default([]),
  allowedOutputRoots: z.array(z.string()).default([]),
})]);

export interface GlobalConfig {
  version: 2;
  storageRoot: string;
  allowedProjectRoots: string[];
  allowedOutputRoots: string[];
}

export function configFilePath(): string {
  const base = process.env.APPDATA
    ?? process.env.XDG_CONFIG_HOME
    ?? join(homedir(), ".config");
  return join(base, "project-context", "config.json");
}

export function defaultUserStorageRoot(): string {
  return join(homedir(), ".project-context");
}

export async function loadGlobalConfig(): Promise<GlobalConfig> {
  const configured = process.env.PROJECT_CONTEXT_HOME;
  if (configured) {
    const storageRoot = validateStoragePath(configured);
    return {
      version: 2,
      storageRoot,
      allowedProjectRoots: environmentPaths("PROJECT_CONTEXT_ALLOWED_ROOTS"),
      allowedOutputRoots: environmentPaths("PROJECT_CONTEXT_ALLOWED_OUTPUT_ROOTS", [storageRoot]),
    };
  }
  try {
    const raw = await readFile(configFilePath(), "utf8");
    return normalizeConfig(storedConfigSchema.parse(JSON.parse(raw)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new ProjectContextError(
        "STORAGE_NOT_CONFIGURED",
        "Project Context storage is not configured. Run `project-context init` first.",
        { suggestedCommand: "project-context init" },
      );
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      throw new ProjectContextError(
        "INVALID_CONFIG",
        `Invalid Project Context config at ${configFilePath()}`,
      );
    }
    throw error;
  }
}

export async function saveGlobalConfig(
  storageRoot: string,
  options: { allowedProjectRoots?: string[]; allowedOutputRoots?: string[] } = {},
): Promise<GlobalConfig> {
  const validated = validateStoragePath(storageRoot);
  await ensureWritableDirectory(validated);
  const config: GlobalConfig = {
    version: 2,
    storageRoot: validated,
    allowedProjectRoots: normalizeAbsolutePaths(options.allowedProjectRoots ?? []),
    allowedOutputRoots: normalizeAbsolutePaths(options.allowedOutputRoots ?? [validated]),
  };
  const target = configFilePath();
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(config, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  return config;
}

function normalizeConfig(config: z.infer<typeof storedConfigSchema>): GlobalConfig {
  const storageRoot = validateStoragePath(config.storageRoot);
  return {
    version: 2,
    storageRoot,
    allowedProjectRoots: normalizeAbsolutePaths("allowedProjectRoots" in config ? config.allowedProjectRoots : []),
    allowedOutputRoots: normalizeAbsolutePaths("allowedOutputRoots" in config ? config.allowedOutputRoots : [storageRoot]),
  };
}

function environmentPaths(name: string, fallback: string[] = []): string[] {
  const value = process.env[name];
  return normalizeAbsolutePaths(value ? value.split(delimiter).filter(Boolean) : fallback);
}

function normalizeAbsolutePaths(paths: string[]): string[] {
  return [...new Set(paths.map((path) => {
    if (!isAbsolute(path)) throw new ProjectContextError("INVALID_CONFIG", "Allowed paths must be absolute.");
    return normalize(resolve(path));
  }))];
}

export function validateStoragePath(input: string): string {
  if (!isAbsolute(input)) {
    throw new ProjectContextError("INVALID_STORAGE_PATH", "Storage path must be absolute.");
  }
  const target = normalize(resolve(input));
  const forbiddenNames = new Set([".git", ".hg", ".svn", "node_modules"]);
  if (target.toLowerCase().split(/[\\/]+/).some((segment) => forbiddenNames.has(segment))) {
    throw new ProjectContextError(
      "UNSAFE_STORAGE_PATH",
      "Storage cannot be placed inside version-control metadata or node_modules.",
    );
  }
  if (target === normalize(resolve(tmpdir()))) {
    throw new ProjectContextError("UNSAFE_STORAGE_PATH", "The system temp directory is not persistent storage.");
  }
  return target;
}

async function ensureWritableDirectory(target: string): Promise<void> {
  try {
    const existing = await stat(target).catch(() => undefined);
    if (existing && !existing.isDirectory()) {
      throw new ProjectContextError("INVALID_STORAGE_PATH", "Storage path points to a file.");
    }
    await mkdir(target, { recursive: true, mode: 0o700 });
    await access(target, constants.R_OK | constants.W_OK);
    const probe = join(target, `.write-test-${process.pid}`);
    await writeFile(probe, "ok", { encoding: "utf8", mode: 0o600 });
    await rm(probe, { force: true });
  } catch (error) {
    if (error instanceof ProjectContextError) throw error;
    throw new ProjectContextError(
      "STORAGE_NOT_WRITABLE",
      `Storage directory is not writable: ${target}`,
    );
  }
}
