// 2026-11-20 IMPROVEMENTS #9 · P2(Mac msg_63d4ddd16bbd) · 2차 P2(Mac msg_a4cae4da3aef): 대시보드 「SEO 스튜디오 확장 연결 코드 사용 기록」 한 줄.
// 한 번의 조회(최신 1건)만 근거 — 0행 코드 없음 / 1행 null 사용 기록 없음 / 시각 과거 기록 / 오류 불러오지 못함. 외부 요청 0.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const src = readFileSync(new URL("../lib/extensionLinkStatus.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", js)(mod, mod.exports);
const { extensionLinkLabel, extensionLinkFromQuery } = mod.exports;
const page = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");
const view = readFileSync(new URL("../components/studio/DashboardView.tsx", import.meta.url), "utf8");
const label = (result) => extensionLinkLabel(extensionLinkFromQuery(result));

test("4가지 상태: 0행 코드 없음 / 1행 null 사용 기록 없음 / 시각 과거 기록 / 오류 불러오지 못함", () => {
  assert.deepEqual(extensionLinkFromQuery({ data: [], error: null }), { state: "ok", hasToken: false, lastUsedAt: null });
  assert.match(label({ data: [], error: null }).text, /연결 코드가 없습니다/);
  assert.deepEqual(extensionLinkFromQuery({ data: [{ last_used_at: null }], error: null }), { state: "ok", hasToken: true, lastUsedAt: null });
  assert.match(label({ data: [{ last_used_at: null }], error: null }).text, /연결 코드는 있지만 아직 사용 기록이 없습니다/);
  const used = label({ data: [{ last_used_at: "2026-11-20T05:03:00Z" }], error: null });
  assert.match(used.text, /^SEO 스튜디오 확장이 마지막으로 사용된 기록: .*\(지금 연결 상태가 아닌 과거 기록\)$/);
  assert.match(used.text, /2:03|14:03/);
  assert.equal(used.showSettingsLink, false);
  for (const result of [{ data: null, error: { message: "x" } }, { data: [{ last_used_at: "2026-11-20T05:03:00Z" }], error: { message: "x" } }, { data: "x", error: null }, { data: [null], error: null }, null, undefined]) {
    assert.deepEqual(extensionLinkFromQuery(result), { state: "error" }, JSON.stringify(result));
    assert.match(label(result).text, /연결 기록을 불러오지 못했습니다/);
  }
});

test("문구: 「연결됨」 실시간 표현 없음, 모든 상태에 범위(SEO 스튜디오 확장)", () => {
  for (const result of [{ data: [], error: null }, { data: [{ last_used_at: null }], error: null }, { data: [{ last_used_at: "2026-11-20T05:03:00Z" }], error: null }, { data: null, error: {} }]) {
    const text = label(result).text;
    assert.match(text, /SEO 스튜디오 확장/);
    assert.doesNotMatch(text, /연결됨/);
  }
  assert.match(label({ data: [{ last_used_at: "not-a-date" }], error: null }).text, /아직 사용 기록이 없습니다/);
});

test("대시보드: 같은 조건(본인·SEO 전용 slug·폐기 안 됨)의 한 GET만 — 최신 1건, 개수 집계·두 응답 결합 없음", () => {
  assert.match(page, /const PROGRAM_SLUG = "naver-blog-seo-studio";/);
  const query = String.raw`\.from\("personal_access_tokens"\)\.select\("last_used_at"\)\.eq\("user_id", user\.id\)\.eq\("program_slug", PROGRAM_SLUG\)\.is\("revoked_at", null\)\s*\.order\("last_used_at", \{ ascending: false, nullsFirst: false \}\)\.limit\(1\)`;
  assert.match(page, new RegExp(query));
  assert.equal((page.match(/\.from\("personal_access_tokens"\)/g) || []).length, 1, "조회는 한 번");
  assert.doesNotMatch(page, /count: "exact"|head: true|Promise\.all|\.sort\(/);
  assert.match(page, /extensionLink = extensionLinkFromQuery\(latest\);/);
  assert.match(page, /let extensionLink: ExtensionLinkStatus = \{ state: "error" \};/);
  assert.match(page, /requireProgramAccess\(\)/);
});

test("화면: 실시간 상태 데이터 속성 없음, 설정 링크는 필요할 때만", () => {
  assert.doesNotMatch(view, /data-connected|link\.connected/);
  assert.match(view, /link\.showSettingsLink && <a href="\/settings">/);
  assert.match(view, /extensionLinkLabel\(extensionLink\)/);
});
