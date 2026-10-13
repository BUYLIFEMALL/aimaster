import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { emptyWorkspace, localDate } from "../src/lib/planner/model.ts";
import { applyCommand } from "../src/lib/planner/engine.ts";
const fixtures = {
  "../access": `export async function checkProgramAccessApi(){return globalThis.__plannerAuth.access;}`,
  "../config": `export function platformConfigured(){return true;}`,
  "@/lib/access": `export async function checkProgramAccessApi(){return globalThis.__plannerAuth.access;}`,
  "@/lib/config": `export function platformConfigured(){return true;}`,
  "@/lib/planner/repository": `export async function loadWorkspace(id){globalThis.__plannerAuth.loaded.push(id); return globalThis.__plannerAuth.records[id];}`,
  "@/lib/planner/gemini": `export async function analyzeWithGemini(key,model,data){globalThis.__plannerAuth.ai.push({key,model,data});return {summary:"fixture",strengths:["fixture"],suggestions:Array.from({length:3},()=>({action:"fixture",evidence:"fixture"}))};}`,
  "./supabase/admin": `export function createAdminClient(){const state=globalThis.__plannerAuth; const query={filters:{},select(){return query},eq(k,v){query.filters[k]=v;return query},order(){return query},limit(){return query},async maybeSingle(){state.keys.push(query.filters);return {error:null,data:state.apiKeys[query.filters.user_id]?{api_key:state.apiKeys[query.filters.user_id]}:null}}};return {from(table){if(table!=="user_api_keys")throw Error("unexpected table");return query}}}`
};
await mkdir("test-artifacts", { recursive: true });
async function subject(entry, name) {
  const result = await build({ entryPoints: [entry], bundle: true, write: false, format: "esm", platform: "node", packages: "external", tsconfig: "tsconfig.json", plugins: [{ name: "authorized-fixtures", setup(b) {
    b.onResolve({ filter: /.*/ }, args => { if (args.path === "server-only") return { path: "server-only", namespace: "fixture" }; if (Object.hasOwn(fixtures, args.path)) return { path: args.path, namespace: "fixture" }; });
    b.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path === "server-only" ? "" : fixtures[args.path], loader: "js" }));
  } }] });
  const file = path.resolve(`test-artifacts/${name}.mjs`); await writeFile(file, result.outputFiles[0].text); return import(pathToFileURL(file).href);
}
const { POST } = await subject("src/app/api/analysis/route.ts", "analysis-api-test");
const { GET } = await subject("src/app/api/keys/route.ts", "keys-api-test");
test("analysis API rejects CSRF/denied access/stale data and uses only authenticated member records and keys", async () => {
  const { NextRequest } = await import("next/server.js");
  const now = Date.now(), date = localDate(now), records = {};
  for (const id of ["member-a", "member-b"]) {
    let w = emptyWorkspace(); w = applyCommand(w, { type: "task.add", input: { title: id, plannedDate: date, estimatedMinutes: 0, priority: "normal", categoryId: w.settings.defaultCategoryId } }, now - 1000); w = applyCommand(w, { type: "task.complete", id: w.tasks[0].id }, now); records[id] = { workspace: w, revision: 1 };
  }
  const state = globalThis.__plannerAuth = { access: { allowed: false, error: "로그인 필요", status: 401 }, records, loaded: [], keys: [], ai: [], apiKeys: { "member-b": "fixture-key-b" } };
  const request = (data, origin = "https://planner.example") => new NextRequest("https://planner.example/api/analysis", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(data) });
  const input = { date, categoryId: "", query: "", revision: 1 };
  try {
    assert.equal((await POST(request(input, "https://attacker.example"))).status, 403);
    assert.equal((await POST(request(input))).status, 401); assert.equal((await GET()).status, 401); assert.deepEqual(state.loaded, []); assert.deepEqual(state.keys, []);
    state.access = { allowed: true, user: { id: "member-a" } };
    assert.equal((await POST(request({ ...input, userId: "member-b" }))).status, 400);
    assert.equal((await POST(request({ ...input, revision: 0 }))).status, 409); assert.equal((await POST(request({ ...input, query: "no-match" }))).status, 400); assert.deepEqual(state.ai, []); assert.deepEqual(state.keys, []);
    const noKey = await POST(request(input)); assert.equal(noKey.status, 400); assert.equal((await noKey.json()).needKey, true);
    assert.deepEqual(await (await GET()).json(), { hasKey: false }); assert.deepEqual(state.ai, []); assert.ok(state.keys.every(q => q.user_id === "member-a" && q.provider === "gemini"));
    state.access = { allowed: true, user: { id: "member-b" } };
    const ok = await POST(request(input)); assert.equal(ok.status, 200); assert.match(ok.headers.get("cache-control"), /private.*no-store/); assert.equal(state.ai.length, 1); assert.equal(state.ai[0].key, "fixture-key-b"); assert.equal(state.ai[0].data.tasks[0].title, "member-b");
    assert.deepEqual(await (await GET()).json(), { hasKey: true }); assert.ok(!(await ok.text()).includes("fixture-key-b"));
  } finally { delete globalThis.__plannerAuth; }
});
