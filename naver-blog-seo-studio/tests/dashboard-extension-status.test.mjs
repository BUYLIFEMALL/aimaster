// 2026-11-20 IMPROVEMENTS #9 · P2(Mac msg_63d4ddd16bbd): 대시보드 「SEO 스튜디오 확장 연결 코드 사용 기록」 한 줄. 외부 요청 0.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const src = readFileSync(new URL("../lib/extensionLinkStatus.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", js)(mod, mod.exports);
const { extensionLinkLabel } = mod.exports;
const page = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");
const view = readFileSync(new URL("../components/studio/DashboardView.tsx", import.meta.url), "utf8");

test("조회 실패는 「불러오지 못함」 — 코드 없음·사용 기록 없음과 구분", () => {
  for (const status of [null, undefined, { state: "error" }]) {
    const r = extensionLinkLabel(status);
    assert.match(r.text, /연결 기록을 불러오지 못했습니다/);
    assert.equal(r.showSettingsLink, true);
  }
});

test("코드 없음 / 코드는 있으나 사용 기록 없음은 각각 다른 문구", () => {
  const none = extensionLinkLabel({ state: "ok", tokenCount: 0, lastUsedAt: null });
  assert.match(none.text, /연결 코드가 없습니다/);
  for (const lastUsedAt of [null, "not-a-date"]) {
    const unused = extensionLinkLabel({ state: "ok", tokenCount: 1, lastUsedAt });
    assert.match(unused.text, /아직 사용 기록이 없습니다/);
    assert.doesNotMatch(unused.text, /불러오지 못했습니다|연결 코드가 없습니다/);
  }
});

test("사용 기록은 과거 기록으로만 표기 — 「연결됨」 같은 실시간 문구 없음, 범위(SEO 스튜디오 확장) 명시", () => {
  const r = extensionLinkLabel({ state: "ok", tokenCount: 2, lastUsedAt: "2026-11-20T05:03:00Z" });
  assert.match(r.text, /^SEO 스튜디오 확장이 마지막으로 사용된 기록: /);
  assert.match(r.text, /지금 연결 상태가 아닌 과거 기록/);
  assert.match(r.text, /2:03|14:03/);
  assert.doesNotMatch(r.text, /연결됨/);
  assert.equal(r.showSettingsLink, false);
  for (const status of [{ state: "error" }, { state: "ok", tokenCount: 0, lastUsedAt: null }]) assert.match(extensionLinkLabel(status).text, /SEO 스튜디오 확장/);
});

test("대시보드 조회: 같은 조건(본인·SEO 전용 slug·폐기 안 됨)으로 최신 1건(사용 기록 없는 행 뒤로)과 개수 집계를 따로", () => {
  assert.match(page, /const PROGRAM_SLUG = "naver-blog-seo-studio";/);
  const cond = String.raw`\.eq\("user_id", user\.id\)\.eq\("program_slug", PROGRAM_SLUG\)\.is\("revoked_at", null\)`;
  assert.match(page, new RegExp(String.raw`\.select\("last_used_at"\)` + cond + String.raw`\s*\.order\("last_used_at", \{ ascending: false, nullsFirst: false \}\)\.limit\(1\)`));
  assert.match(page, new RegExp(String.raw`\.select\("id", \{ count: "exact", head: true \}\)` + cond));
  assert.doesNotMatch(page, /\.sort\(/, "배열 정렬에 의존하지 않음");
  assert.match(page, /let extensionLink: ExtensionLinkStatus = \{ state: "error" \};/);
  assert.match(page, /requireProgramAccess\(\)/);
});

test("화면: 실시간 상태 데이터 속성 없음, 설정 링크는 필요할 때만", () => {
  assert.doesNotMatch(view, /data-connected|link\.connected/);
  assert.match(view, /link\.showSettingsLink && <a href="\/settings">/);
  assert.match(view, /extensionLinkLabel\(extensionLink\)/);
});
