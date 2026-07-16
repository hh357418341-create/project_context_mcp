import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ProjectContextApp } from "../src/core/app.js";
import { startUiServer, type UiServerHandle } from "../src/ui/server.js";

describe("localhost rule manager", () => {
  let tempRoot: string;
  let projectRoot: string;
  let previousEnvironment: Record<string, string | undefined>;
  let ui: UiServerHandle | undefined;

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "project-context-ui-"));
    projectRoot = join(tempRoot, "project");
    await mkdir(projectRoot, { recursive: true });
    await writeFile(join(projectRoot, "README.md"), "# UI test\n", "utf8");
    await mkdir(join(projectRoot, "src"), { recursive: true });
    await writeFile(join(projectRoot, "src", "service.ts"), `
      import { helper } from "./helper";
      export function run() { return helper(); }
    `, "utf8");
    await writeFile(join(projectRoot, "src", "helper.ts"), `
      export function helper() { return "ok"; }
    `, "utf8");
    previousEnvironment = {
      PROJECT_CONTEXT_HOME: process.env.PROJECT_CONTEXT_HOME,
      PROJECT_CONTEXT_ALLOWED_ROOTS: process.env.PROJECT_CONTEXT_ALLOWED_ROOTS,
      PROJECT_CONTEXT_ALLOWED_OUTPUT_ROOTS: process.env.PROJECT_CONTEXT_ALLOWED_OUTPUT_ROOTS,
    };
    process.env.PROJECT_CONTEXT_HOME = join(tempRoot, "memory");
    process.env.PROJECT_CONTEXT_ALLOWED_ROOTS = tempRoot;
    process.env.PROJECT_CONTEXT_ALLOWED_OUTPUT_ROOTS = tempRoot;
  });

  afterEach(async () => {
    await ui?.close();
    for (const [name, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await rm(tempRoot, { recursive: true, force: true });
  });

  it("authenticates locally and completes create, version, soft-delete, and context-preview flows", async () => {
    const app = await ProjectContextApp.create();
    const project = await app.openProject(projectRoot);
    await app.index(project.id);
    app.close();
    ui = await startUiServer({ openBrowser: false });
    const origin = ui.url;
    const page = await fetch(origin);
    expect(page.status).toBe(200);
    expect(page.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(await page.text()).toContain("Project Context");

    const unauthenticated = await api(origin, "/api/bootstrap");
    expect(unauthenticated.response.status).toBe(401);

    const launch = new URL(ui.launchUrl);
    const token = new URLSearchParams(launch.hash.slice(1)).get("token");
    const session = await api(origin, "/api/session", { method: "POST", body: { token } });
    expect(session.response.status).toBe(200);
    const cookie = session.response.headers.get("set-cookie")?.split(";")[0];
    expect(cookie).toMatch(/^project_context_ui=/);
    const browserStyleGet = await fetch(`${origin}/api/bootstrap`, {
      headers: { "X-Project-Context-UI": "1", Cookie: cookie ?? "" },
    });
    expect(browserStyleGet.status).toBe(200);

    const portrait = await api(origin, `/api/projects/${project.id}/portrait`, { cookie });
    expect(portrait.response.status).toBe(200);
    expect(portrait.body).toMatchObject({
      project: { id: project.id, name: "project" },
      health: { sources: 3, schemaVersion: 6 },
      statuses: { memories: {}, candidates: {}, tasks: {} },
    });
    expect((portrait.body as { fileTypes: Array<{ extension: string; count: number }> }).fileTypes)
      .toEqual(expect.arrayContaining([expect.objectContaining({ extension: ".ts", count: 2 })]));

    const vendor = await fetch(`${origin}/vendor/cytoscape.js`);
    expect(vendor.status).toBe(200);
    expect(await vendor.text()).toContain("cytoscape");

    const graph = await api(origin, `/api/projects/${project.id}/graph?relation=CALLS&relation=IMPORTS`, { cookie });
    expect(graph.response.status).toBe(200);
    expect(graph.body).toMatchObject({ mode: "files", truncated: false });
    expect((graph.body as { nodes: unknown[]; edges: unknown[] }).nodes).toHaveLength(3);
    expect((graph.body as { edges: Array<{ relationType: string }> }).edges.map((edge) => edge.relationType))
      .toEqual(expect.arrayContaining(["CALLS", "IMPORTS"]));

    const graphSearch = await api(origin, `/api/projects/${project.id}/graph/search?q=run`, { cookie });
    expect(graphSearch.response.status).toBe(200);
    const graphResult = (graphSearch.body as { results: Array<{ id: string; label: string }> }).results[0]!;
    expect(graphResult.label).toBe("run");

    const graphNode = await api(origin, `/api/projects/${project.id}/graph/nodes/${encodeURIComponent(graphResult.id)}`, { cookie });
    expect(graphNode.body).toMatchObject({ id: graphResult.id, nodeType: "symbol", name: "run" });

    const graphNeighbors = await api(origin, `/api/projects/${project.id}/graph/neighbors?node=${encodeURIComponent(graphResult.id)}&depth=1`, { cookie });
    expect(graphNeighbors.body).toMatchObject({ mode: "symbols", root: graphResult.id });
    expect((graphNeighbors.body as { nodes: Array<{ label: string }> }).nodes.map((node) => node.label)).toContain("helper");

    const invalidGraphDepth = await api(origin, `/api/projects/${project.id}/graph/neighbors?node=${encodeURIComponent(graphResult.id)}&depth=3`, { cookie });
    expect(invalidGraphDepth.response.status).toBe(400);
    const invalidGraphRelation = await api(origin, `/api/projects/${project.id}/graph?relation=EXECUTES`, { cookie });
    expect(invalidGraphRelation.response.status).toBe(400);

    const created = await api(origin, "/api/memories", {
      method: "POST",
      cookie,
      body: {
        type: "constraint",
        title: "Project checks",
        content: "Run typecheck before tests.",
        scopeLevel: "project",
        projectId: project.id,
      },
    });
    expect(created.response.status).toBe(200);
    const createdMemory = created.body as { id: string };

    const versioned = await api(origin, `/api/memories/${createdMemory.id}`, {
      method: "PUT",
      cookie,
      body: {
        type: "constraint",
        title: "Project checks",
        content: "Run typecheck and focused tests before the full suite.",
        scopeLevel: "project",
        projectId: project.id,
      },
    });
    expect(versioned.response.status).toBe(200);
    const newMemory = versioned.body as { id: string; supersedesId: string };
    expect(newMemory.supersedesId).toBe(createdMemory.id);
    const invalidReactivation = await api(origin, `/api/memories/${createdMemory.id}/status`, {
      method: "PATCH", cookie, body: { status: "active" },
    });
    expect(invalidReactivation.response.status).toBe(400);
    expect(invalidReactivation.body).toMatchObject({ code: "USER_MEMORY_REACTIVATION_BLOCKED" });

    const preview = await api(origin, "/api/context-preview", {
      method: "POST",
      cookie,
      body: { projectId: project.id, task: "run project checks", budgetTokens: 2_000 },
    });
    expect(preview.response.status).toBe(200);
    expect((preview.body as { userMemories: Array<{ id: string }> }).userMemories.map((item) => item.id))
      .toContain(newMemory.id);

    const deleted = await api(origin, `/api/memories/${newMemory.id}/status`, {
      method: "PATCH", cookie, body: { status: "deleted" },
    });
    expect(deleted.body).toMatchObject({ id: newMemory.id, status: "deleted" });
    const bootstrap = await api(origin, "/api/bootstrap", { cookie });
    const memories = (bootstrap.body as { memories: Array<{ id: string; status: string }> }).memories;
    expect(memories).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: createdMemory.id, status: "superseded" }),
      expect.objectContaining({ id: newMemory.id, status: "deleted" }),
    ]));
  });

  it("rejects cross-origin API requests and oversized bodies", async () => {
    ui = await startUiServer({ openBrowser: false });
    const crossOrigin = await fetch(`${ui.url}/api/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://evil.example", "X-Project-Context-UI": "1" },
      body: JSON.stringify({ token: "anything" }),
    });
    expect(crossOrigin.status).toBe(403);

    const token = new URLSearchParams(new URL(ui.launchUrl).hash.slice(1)).get("token");
    const session = await api(ui.url, "/api/session", { method: "POST", body: { token } });
    const cookie = session.response.headers.get("set-cookie")?.split(";")[0];
    const oversized = await fetch(`${ui.url}/api/memories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: ui.url,
        "X-Project-Context-UI": "1",
        Cookie: cookie ?? "",
      },
      body: JSON.stringify({ content: "x".repeat(70_000) }),
    });
    expect(oversized.status).toBe(413);
  });
});

async function api(origin: string, path: string, options: {
  method?: string;
  body?: unknown;
  cookie?: string;
} = {}): Promise<{ response: Response; body: unknown }> {
  const response = await fetch(`${origin}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "X-Project-Context-UI": "1",
      ...(options.cookie ? { Cookie: options.cookie } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  return { response, body: await response.json() };
}
