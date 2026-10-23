// 병합 B-2(A안): 30일 지난 문체는 원문만 비우고 분석 결과·승인·끝맺음을 남긴다. 분석 없는 「자료만」 문체는 지운다. 네트워크 없음.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { styleEnding, clearedStyleProfile, profileHash, isStyleApproved } from "../lib/style.ts";
const require = createRequire(import.meta.url);
const ts = require("typescript");
function moduleAt(path, mocks = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { console, Date })(name => name in mocks ? mocks[name] : require(name), module, module.exports);
  return module.exports;
}

const profile = { summary: "다정한 생활 정보 블로그", tone: "친근", sentence: "짧게", structure: "목록", reader: "초보", expressions: [], avoid: [], strengths: [], cautions: [] };
const samples = ["오늘은 캠핑 준비물을 정리했어요. 정말 편했어요. 다음에도 써 볼게요. 추천해요."];

test("styleEnding: detects from raw text, falls back to the kept profile.ending after clearing", () => {
  assert.equal(styleEnding({ profile, samples, posts: [] }), "haeyo");
  assert.equal(styleEnding({ profile: { ...profile, ending: "hamnida" }, samples: [], posts: [] }), "hamnida");
  assert.equal(styleEnding({ profile: { ...profile, ending: "엉뚱" }, samples: [], posts: [] }), null);
  assert.equal(styleEnding({ profile: null, samples: [], posts: [] }), null);
});

test("clearedStyleProfile keeps the approval valid and records ending; analysis-less styles return null", () => {
  const row = { profile, samples, posts: [], approved_at: "2026-09-01T00:00:00Z", approval_hash: profileHash(profile) };
  const cleared = clearedStyleProfile(row, "2026-10-24T00:00:00Z");
  assert.equal(cleared.ending, "haeyo"); assert.equal(cleared.sourceClearedAt, "2026-10-24T00:00:00Z");
  assert.ok(isStyleApproved({ ...row, profile: cleared }));
  assert.equal(clearedStyleProfile({ profile: null, samples }), null);
  assert.equal(clearedStyleProfile({ profile: { ...cleared }, samples: [] }, "2026-12-01T00:00:00Z").sourceClearedAt, "2026-10-24T00:00:00Z");
});

test("purgeExpiredStyles clears raw text of analyzed styles, deletes source-only styles, counts per member", async () => {
  const rows = [
    { id: "s1", user_id: "m1", created_at: "2026-08-01T00:00:00Z", profile, samples, posts: [{ title: "t", link: "l", text: "x" }] },
    { id: "s2", user_id: "m1", created_at: "2026-08-01T00:00:00Z", profile: null, samples, posts: [] },
    { id: "s3", user_id: "m2", created_at: new Date().toISOString(), profile, samples, posts: [] },
  ];
  const field = (row, key) => key.split(/->>?/).reduce((v, k) => v?.[k], row) ?? null;
  const db = { from() {
    const filters = []; let mode = "select", changes;
    const q = {
      select() { return q; }, update(v) { mode = "update"; changes = v; return q; }, delete() { mode = "delete"; return q; },
      lt(k, v) { filters.push(r => field(r, k) < v); return q; }, is(k, v) { filters.push(r => field(r, k) === v); return q; },
      eq(k, v) { filters.push(r => field(r, k) === v); return q; }, limit() { return q; },
      then(resolve) { resolve({ data: rows.filter(r => filters.every(f => f(r))), error: null }); },
      async maybeSingle() {
        const i = rows.findIndex(r => filters.every(f => f(r)));
        if (i < 0) return { data: null, error: null };
        if (mode === "update") Object.assign(rows[i], structuredClone(changes));
        const data = { id: rows[i].id };
        if (mode === "delete") rows.splice(i, 1);
        return { data, error: null };
      },
    }; return q;
  } };
  const counts = new Map();
  const style = await import("../lib/style.ts");
  const retention = moduleAt("../lib/draftRetention.ts", { "@/lib/style": style, "@/lib/cleanupUsageLog": { addCleanupCount: (c, u, k) => c.set(`${u}:${k}`, (c.get(`${u}:${k}`) || 0) + 1) } });
  const result = await retention.purgeExpiredStyles(db, undefined, counts);
  assert.equal(result.deleted, 2); assert.equal(result.error, null);
  const s1 = rows.find(r => r.id === "s1");
  assert.deepEqual([s1.samples, s1.posts], [[], []]); assert.equal(s1.profile.ending, "haeyo"); assert.ok(s1.profile.sourceClearedAt);
  assert.equal(rows.some(r => r.id === "s2"), false);
  assert.equal(rows.find(r => r.id === "s3").samples.length, 1);
  assert.equal(counts.get("m1:styles"), 2);
  assert.equal((await retention.purgeExpiredStyles(db)).deleted, 0); // 이미 정리한 문체는 다시 손대지 않음
});
