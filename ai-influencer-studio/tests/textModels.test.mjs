// 글 생성 모델 목록 시험 (2026-11-20, CC-SNS-01). 실제 호출·네트워크 0.
// 목록이 루트 docs/AI_MODEL_CATALOG.md와 어긋나면 여기서 잡힌다 — 「그 모델이 실제로 응답한다」는 이 시험으로 알 수 없다.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as M from "../src/lib/textModels.ts";

const catalog = readFileSync(new URL("../../docs/AI_MODEL_CATALOG.md", import.meta.url), "utf8");
const lines = catalog.split("\n");
const rowOf = (head) => lines.find((l) => l.startsWith(head));
const idIn = (cell) => /`([^`]+)`/.exec(cell)?.[1];
// 선택표 1절: | 등급 | Gemini | OpenAI | Claude |
const CATALOG = Object.fromEntries([["value", "| **저가 가성비**"], ["balanced", "| **중가 균형**"], ["top", "| **최상급 성능**"]].map(([tier, head]) => {
  const row = rowOf(head);
  assert.ok(row, "모델 선택표에서 줄을 찾지 못했습니다: " + head);
  const c = row.split("|");
  return [tier, { gemini: idIn(c[2]), openai: idIn(c[3]), anthropic: idIn(c[4]) }];
}));

test("9개: 회사 3 × 등급 3이 하나씩이고 번호가 겹치지 않는다", () => {
  assert.equal(M.TEXT_MODELS.length, 9);
  assert.equal(new Set(M.TEXT_MODELS.map((m) => m.id)).size, 9);
  for (const p of ["gemini", "openai", "anthropic"]) for (const t of ["balanced", "value", "top"])
    assert.equal(M.TEXT_MODELS.filter((m) => m.provider === p && m.tier === t).length, 1, `${p}/${t}`);
});

test("목록의 번호가 모델 선택표 1절 추천과 글자 그대로 같다", () => {
  for (const m of M.TEXT_MODELS) assert.equal(m.id, CATALOG[m.tier][m.provider], `${m.provider}/${m.tier}`);
});

test("미리보기 모델이 없고, 선택표 5절 「넣지 않는 모델」에 든 이름이 없다", () => {
  const banned = lines.slice(lines.findIndex((l) => l.startsWith("## 5.")), lines.findIndex((l) => l.startsWith("## 6."))).join("\n");
  for (const m of M.TEXT_MODELS) {
    assert.doesNotMatch(m.id, /preview/i, m.id);
    assert.equal(banned.includes("`" + m.id + "`"), false, m.id + "가 금지 목록에 있습니다");
  }
});

test("기본 모델은 Gemini 균형이고 지금 실제 호출 모델(gemini.ts의 TEXT_MODEL)과 같다", () => {
  const def = M.TEXT_MODELS.find((m) => m.id === M.DEFAULT_TEXT_MODEL);
  assert.equal(def.provider, "gemini"); assert.equal(def.tier, "balanced");
  const src = readFileSync(new URL("../src/lib/gemini.ts", import.meta.url), "utf8");
  assert.equal(/export const TEXT_MODEL = "([^"]+)";/.exec(src)?.[1], M.DEFAULT_TEXT_MODEL);
});

test("currentTextModel: 목록 안 값은 그대로, 옛 값은 대체 모델, 그 밖은 기본 모델", () => {
  assert.equal(M.currentTextModel("claude-haiku-5-5"), "claude-haiku-5-5");
  assert.equal(M.currentTextModel("gemini-3-flash-preview"), "gemini-3.8-flash");
  for (const v of [undefined, null, "", 3, {}, ["gpt-6-luna"], "gpt-4o", "GEMINI-3.8-FLASH", " gemini-3.8-flash", "__proto__", "constructor", "toString"])
    assert.equal(M.currentTextModel(v), M.DEFAULT_TEXT_MODEL, String(v));
});

test("textModelProvider: 모델의 회사를 돌려주고, 모르는 값은 기본 모델의 회사", () => {
  assert.equal(M.textModelProvider("gpt-6-astra"), "openai");
  assert.equal(M.textModelProvider("claude-opus-5-5"), "anthropic");
  assert.equal(M.textModelProvider("없는-모델"), "gemini");
});

test("묶음: 회사 순서는 Gemini → OpenAI → Claude, 묶음 안은 균형 → 가성비 → 최고 품질", () => {
  const g = M.textModelGroups();
  assert.deepEqual(g.map((x) => x.provider), ["gemini", "openai", "anthropic"]);
  for (const x of g) assert.deepEqual(x.models.map((m) => m.tier), ["balanced", "value", "top"], x.provider);
});

test("회사를 바꾸면 그 회사의 균형 모델", () => {
  assert.equal(M.defaultModelOf("gemini"), "gemini-3.8-flash");
  assert.equal(M.defaultModelOf("openai"), "gpt-6.1-terra");
  assert.equal(M.defaultModelOf("anthropic"), "claude-sonnet-5-5");
});

test("표시 글: 등급 이름 + 모델 이름, 금액은 적지 않는다", () => {
  const label = Object.fromEntries(M.TEXT_MODELS.map((m) => [m.id, M.textModelLabel(m)]));
  assert.equal(label["gemini-3.8-flash"], "균형 (추천) · Gemini 3.8 Flash");
  assert.equal(label["gemini-4-argon"], "최고 품질 · Gemini 4 Argon (결제 연결 키 필요)");
  assert.equal(label["claude-haiku-5-5"], "가성비 · Claude Haiku 5.5");
  for (const s of Object.values(label)) assert.doesNotMatch(s, /\$|원|달러/);
});

test("키 없음 안내: 그 회사 이름과 등록 위치를 말한다", () => {
  for (const p of ["gemini", "openai", "anthropic"]) {
    const s = M.missingTextKeyMessage(p);
    assert.ok(s.includes(M.TEXT_PROVIDER_LABEL[p]), p); assert.match(s, /API키등록·플랫폼연동/); assert.match(s, /본인 키/);
  }
});
