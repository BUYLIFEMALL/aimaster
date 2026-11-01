// 2026-11-02: 30일 삭제 예외 회원(profiles.retention_exempt)은 크론·본인 정리 모두에서 지우지 않는다. 네트워크 없음.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
const require = createRequire(import.meta.url);
const ts = require("typescript");

const OLD = "2026-08-01T00:00:00Z";
function load() {
  const code = ts.transpileModule(readFileSync(new URL("../lib/draftRetention.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const mocks = { "@/lib/style": { clearedStyleProfile: () => null }, "@/lib/cleanupUsageLog": { addCleanupCount: () => {} } };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { console, Date })(name => name in mocks ? mocks[name] : require(name), module, module.exports);
  return module.exports;
}

function db({ exempt = ["admin"], profileError = false } = {}) {
  const tables = {
    profiles: [{ id: "admin", retention_exempt: true }, { id: "member", retention_exempt: false }].map(r => ({ ...r, retention_exempt: exempt.includes(r.id) })),
    naver_blog_seo_drafts: [{ id: "d1", user_id: "admin", created_at: OLD }, { id: "d2", user_id: "member", created_at: OLD }],
    naver_blog_seo_title_recommendations: [{ id: "t1", user_id: "admin", created_at: OLD }, { id: "t2", user_id: "member", created_at: OLD }],
    naver_blog_seo_research: [{ id: "r1", user_id: "admin", created_at: OLD }, { id: "r2", user_id: "member", created_at: OLD }],
    naver_blog_seo_styles: [{ id: "s1", user_id: "admin", created_at: OLD, profile: null }, { id: "s2", user_id: "member", created_at: OLD, profile: null }],
    naver_blog_seo_outlines: [{ id: "o1", user_id: "admin", created_at: OLD }, { id: "o2", user_id: "member", created_at: OLD }],
  };
  const removedImages = [];
  const client = {
    storage: { from: () => ({ remove: async paths => { removedImages.push(...paths); return { error: null }; } }) },
    from(table) {
      const filters = []; let mode = "select";
      const matches = () => tables[table].filter(r => filters.every(f => f(r)));
      const finish = () => {
        if (table === "profiles" && profileError) return { data: null, error: { message: "읽기 실패" } };
        const hit = matches();
        if (mode === "delete") tables[table] = tables[table].filter(r => !hit.includes(r));
        return { data: hit.map(r => ({ ...r })), error: null };
      };
      const q = {
        select() { return q; }, delete() { mode = "delete"; return q; }, update() { mode = "update"; return q; }, limit() { return q; },
        lt(k, v) { filters.push(r => r[k] < v); return q; }, eq(k, v) { filters.push(r => r[k] === v); return q; },
        is(k, v) { filters.push(r => (k.includes("->>") ? null : r[k]) === v); return q; },
        in(k, v) { filters.push(r => v.includes(r[k])); return q; },
        not(k, _op, v) { const ids = v.slice(1, -1).split(","); filters.push(r => !ids.includes(r[k])); return q; },
        async maybeSingle() { const out = finish(); return { data: out.data?.[0] ?? null, error: out.error }; },
        then(resolve) { resolve(finish()); },
      };
      return q;
    },
  };
  return { client, tables, removedImages };
}

test("크론 정리는 예외 회원 자료를 남기고 일반 회원 자료만 지운다", async () => {
  const { client, tables } = db();
  const result = await load().purgeExpiredSeoStudioData(client);
  assert.equal(result.error, null);
  for (const name of Object.keys(tables).filter(n => n !== "profiles")) {
    assert.deepEqual(tables[name].map(r => r.user_id), ["admin"], name);
  }
  assert.equal(result.deleted, 5);
});

test("예외 회원 본인 정리는 아무것도 지우지 않고, 일반 회원 본인 정리는 그대로 지운다", async () => {
  const { client, tables } = db();
  const lib = load();
  assert.equal((await lib.purgeExpiredSeoStudioData(client, "admin")).deleted, 0);
  assert.equal(tables.naver_blog_seo_drafts.length, 2);
  assert.equal((await lib.purgeExpiredSeoStudioData(client, "member")).deleted, 5);
  assert.deepEqual(tables.naver_blog_seo_drafts.map(r => r.user_id), ["admin"]);
});

test("예외 회원 목록을 못 읽으면 아무것도 지우지 않고 오류를 돌려준다", async () => {
  const { client, tables } = db({ profileError: true });
  const result = await load().purgeExpiredSeoStudioData(client);
  assert.equal(result.deleted, 0); assert.ok(result.error);
  assert.equal(tables.naver_blog_seo_drafts.length, 2); assert.equal(tables.naver_blog_seo_outlines.length, 2);
});
