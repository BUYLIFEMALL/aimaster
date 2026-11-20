// 2026-11-20 IMPROVEMENTS #9: 대시보드 확장 연결 상태 한 줄. 외부 요청 0.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const src = readFileSync(new URL("../lib/extensionLinkStatus.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", js)(mod, mod.exports);
const { extensionLinkLabel } = mod.exports;

test("연결 코드가 없으면 연결 전 안내", () => {
  for (const status of [null, undefined, { tokenCount: 0, lastUsedAt: null }, { tokenCount: NaN, lastUsedAt: "2026-11-20T00:00:00Z" }]) {
    const r = extensionLinkLabel(status);
    assert.equal(r.connected, false);
    assert.match(r.text, /확장 연결 전/);
  }
});

test("코드는 있지만 사용 기록이 없거나 잘못된 시각이면 미사용 안내", () => {
  for (const lastUsedAt of [null, "not-a-date"]) {
    const r = extensionLinkLabel({ tokenCount: 1, lastUsedAt });
    assert.equal(r.connected, false);
    assert.match(r.text, /아직 사용하지 않았습니다/);
  }
});

test("최근 사용 시각이 있으면 연결됨과 한국 시간 표시", () => {
  const r = extensionLinkLabel({ tokenCount: 2, lastUsedAt: "2026-11-20T05:03:00Z" });
  assert.equal(r.connected, true);
  assert.match(r.text, /^확장 연결됨 · 최근 사용 /);
  assert.match(r.text, /2026/);
  assert.match(r.text, /2:03|14:03/);
});

test("대시보드가 회원 본인·이 프로그램·폐기 안 된 연결 코드만 읽고 화면에 넘긴다", () => {
  const page = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");
  assert.match(page, /\.from\("personal_access_tokens"\)\.select\("last_used_at"\)\.eq\("user_id", user\.id\)\.eq\("program_slug", "naver-blog-seo-studio"\)\.is\("revoked_at", null\)/);
  assert.match(page, /<StudioPage email=\{user\.email \?\? ""\} extensionLink=\{extensionLink\} \/>/);
  assert.match(page, /requireProgramAccess\(\)/);
  const view = readFileSync(new URL("../components/studio/DashboardView.tsx", import.meta.url), "utf8");
  assert.match(view, /extensionLinkLabel\(extensionLink\)/);
  assert.doesNotMatch(view, /api_key|token\b.*value/);
});
