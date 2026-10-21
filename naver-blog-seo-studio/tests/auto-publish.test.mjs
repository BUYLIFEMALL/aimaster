import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
const require = createRequire(import.meta.url);
const ts = require("typescript");
function moduleAt(path, mocks = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { Response, Request, URL, console })(name => name in mocks ? mocks[name] : require(name), module, module.exports);
  return module.exports;
}
const guards = moduleAt("../lib/draftWriteGuard.ts");
const fixture = () => ({ id: "draft-1", user_id: "member-1", title: "자동 발행 합성 시험", body: "본인 합성 원고입니다. 실제 추천이나 체험담이 아닙니다.", created_at: new Date().toISOString(), extension_handoff_at: new Date().toISOString(), seo_report: {}, image_path: null });
const field = (row, column) => column.split(/->>?/).reduce((value, key) => value?.[key], row) ?? null;
function setup(initial = fixture()) {
  const store = { row: structuredClone(initial), updates: 0 };
  const db = { from() {
    const filters = []; let changes, deleting = false;
    const q = {
      select() { return q; }, update(value) { changes = value; return q; }, delete() { deleting = true; return q; },
      eq(key, value) { filters.push(row => field(row, key) === value); return q; },
      is(key, value) { filters.push(row => field(row, key) === value); return q; },
      gte(key, value) { filters.push(row => field(row, key) >= value); return q; },
      not(key, op, value) { assert.equal(op, "is"); filters.push(row => field(row, key) !== value); return q; },
      async maybeSingle() {
        const row = store.row;
        if (!row || !filters.every(filter => filter(row))) return { data: null, error: null };
        if (changes) { Object.assign(row, structuredClone(changes)); store.updates++; }
        const data = structuredClone(row);
        if (deleting) store.row = null;
        return { data, error: null };
      },
    }; return q;
  } };
  const mocks = {
    "next/server": { NextResponse: { json: (data, options) => Response.json(data, options) } },
    "@/lib/extensionAuth": { verifyExtensionToken: async request => request.headers.get("authorization") === "Bearer own" ? { userId: "member-1" } : null },
    "@/lib/access": { checkProgramAccessApi: async () => ({ allowed: true, user: { id: "member-1" } }) },
    "@/lib/supabase/service": { createServiceClient: () => db },
    "@/lib/supabase/server": { createClient: async () => db },
    "@/lib/draftWriteGuard": guards,
  };
  const route = moduleAt("../app/api/extension/drafts/library/[draftId]/auto-publish/route.ts", mocks);
  const call = (action, values = {}, token = "own") => route.POST(new Request("https://test.invalid", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ action, ...(action === "claim" ? { fingerprint: guards.publicationFingerprint(store.row) } : {}), ...values }) }), { params: Promise.resolve({ draftId: "draft-1" }) });
  return { store, db, mocks, call };
}
test("atomic claim grants one run when two extensions race", async () => {
  const s = setup();
  const responses = await Promise.all([s.call("claim", { blogId: "my_blog", visibility: "private" }), s.call("claim", { blogId: "my_blog", visibility: "private" })]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
  assert.equal(s.store.updates, 1);
});
test("foreign, expired, and unauthenticated drafts cannot claim", async () => {
  for (const patch of [{ user_id: "another-member" }, { created_at: "2000-01-01T00:00:00.000Z" }]) {
    const s = setup({ ...fixture(), ...patch });
    assert.equal((await s.call("claim", { blogId: "my_blog", visibility: "private" })).status, 404);
    assert.equal(s.store.updates, 0);
  }
  assert.equal((await setup().call("claim", {}, "invalid")).status, 401);
});
test("arm rejects changed content and cannot grant another final click", async () => {
  const s = setup(); await s.call("claim", { blogId: "my_blog", visibility: "private" });
  const runId = s.store.row.seo_report.autoPublish.runId;
  s.store.row.body += "changed";
  assert.equal((await s.call("arm", { runId })).status, 409);
  const fresh = setup(); await fresh.call("claim", { blogId: "my_blog", visibility: "private" });
  const id = fresh.store.row.seo_report.autoPublish.runId;
  assert.equal((await fresh.call("arm", { runId: id })).status, 200);
  assert.equal((await fresh.call("arm", { runId: id })).status, 409);
});
test("published URL must be this blog, confirmed only after arm, receipt is idempotent", async () => {
  const s = setup(); await s.call("claim", { blogId: "my_blog", visibility: "private" });
  const runId = s.store.row.seo_report.autoPublish.runId;
  assert.equal((await s.call("published", { runId, url: "https://blog.naver.com/my_blog/224123456789" })).status, 409);
  await s.call("arm", { runId });
  for (const url of ["https://evil.invalid/my_blog/224123456789", "https://blog.naver.com/another/224123456789", "https://blog.naver.com/my_blog/postwrite"]) assert.equal((await s.call("published", { runId, url })).status, 400);
  assert.equal((await s.call("published", { runId, url: "https://blog.naver.com/PostView.naver?blogId=my_blog&logNo=224123456789" })).status, 200);
  assert.equal((await s.call("published", { runId, url: "https://blog.naver.com/my_blog/224123456789" })).status, 200);
  assert.equal(s.store.row.seo_report.autoPublish.state, "published");
  assert.equal((await s.call("claim", { blogId: "my_blog", visibility: "private" })).status, 409);
});
test("uncertain results can reconcile but never re-arm or restart", async () => {
  const s = setup(); await s.call("claim", { blogId: "my_blog", visibility: "private" });
  const runId = s.store.row.seo_report.autoPublish.runId;
  await s.call("arm", { runId }); await s.call("uncertain", { runId });
  assert.equal((await s.call("arm", { runId })).status, 409);
  assert.equal((await s.call("published", { runId, url: "https://blog.naver.com/my_blog/224123456789" })).status, 200);
});
test("actual save handler preserves a locked original; revision rejects stale writes", async () => {
  const s = setup(); await s.call("claim", { blogId: "my_blog", visibility: "private" });
  const { PATCH } = moduleAt("../app/api/drafts/[draftId]/route.ts", s.mocks);
  const response = await PATCH(new Request("https://test.invalid", { method: "PATCH", body: JSON.stringify({ title: "changed", body: "합성 원고입니다. ".repeat(30) }) }), { params: Promise.resolve({ draftId: "draft-1" }) });
  assert.equal(response.status, 409); assert.equal(s.store.row.title, "자동 발행 합성 시험");
  const clean = setup(); const original = clean.store.row.seo_report;
  clean.store.row.seo_report = guards.nextDraftReport(original);
  const stale = await guards.writableDraft(clean.db.from().update({ title: "stale" }), original).select().maybeSingle();
  assert.equal(stale.data, null); assert.notEqual(clean.store.row.title, "stale");
});

test("stale preview cannot claim a newer server draft", async () => {
  const s = setup(); const fingerprint = guards.publicationFingerprint(s.store.row);
  s.store.row.body += " newer saved version";
  assert.equal((await s.call("claim", { blogId: "my_blog", visibility: "private", fingerprint })).status, 409);
  assert.equal(s.store.updates, 0);
});
