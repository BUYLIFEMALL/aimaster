// 🤖 AI 시세 요약(2026-10-25, v1.22) — 보내는 숫자 만들기·프롬프트·저렴한 모델 고르기 시험(실제 AI 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAiInput, buildAiPrompt, pickOpenAiModel } from "../extension/lib/aiSummary.js";

const snap = (at: string, total: number, avg: number, ev = { new: 0, priceDown: 0, priceUp: 0, gone: 0 }) => ({
  at,
  complexes: [{ name: "백송마을5단지", total, events: ev, trades: { 매매: { avg, tradeGapAvg: 4 } } }],
  realtors: [{ name: "중개사A", n: 3 }],
});

test("최근 7일 변화: 매물 수·매매 평균 % · 이번 주 변동 합계, 중개사 이름은 넣지 않음", () => {
  const h = [
    snap("2026-10-10T00:00:00Z", 30, 50000), // 7일보다 오래됨 — 빠짐
    snap("2026-10-19T00:00:00Z", 40, 50000, { new: 2, priceDown: 1, priceUp: 0, gone: 0 }),
    snap("2026-10-25T00:00:00Z", 44, 51000, { new: 3, priceDown: 0, priceUp: 1, gone: 1 }),
  ];
  const x = buildAiInput(h)!;
  assert.equal(x.기록회수, 2);
  const c = x.단지들[0];
  assert.equal(c.매물수변화, 4);
  assert.equal(c.매매평균변화퍼센트, 2);
  assert.equal(c.실거래대비퍼센트, 4);
  assert.deepEqual([c.이번주_새매물, c.이번주_가격내림, c.이번주_가격오름, c.이번주_사라짐], [5, 1, 1, 1]);
  assert.equal(JSON.stringify(x).includes("중개사A"), false);
  assert.equal(buildAiInput([]), null);
});

test("프롬프트: 당해 연도·200자·투자 권유 금지", () => {
  const p = buildAiPrompt({ a: 1 }, 2026);
  assert.match(p, /2026년/);
  assert.match(p, /200자/);
  assert.match(p, /투자 권유/);
});

test("OpenAI 모델: nano 먼저, 없으면 mini, 음성·날짜 고정판 제외", () => {
  assert.equal(pickOpenAiModel(["gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-5-nano-2026-01-01", "gpt-4o-mini-audio"]), "gpt-5-nano");
  assert.equal(pickOpenAiModel(["gpt-5", "gpt-4.1-mini", "gpt-4o-mini-realtime"]), "gpt-4.1-mini");
  assert.equal(pickOpenAiModel(["gpt-5", "dall-e-3"]), null);
});

test("쓸 AI 3가지: 이름·키 모양(Claude는 공용 키 anthropic)", async () => {
  const { AI_PROVIDERS, toAiProvider } = await import("../lib/aiProviders.ts");
  assert.deepEqual(AI_PROVIDERS.map((p) => p.id), ["openai", "claude", "gemini"]);
  assert.equal(toAiProvider("claude"), "claude");
  assert.equal(toAiProvider("x"), "gemini");
  const claude = AI_PROVIDERS.find((p) => p.id === "claude")!;
  assert.equal(claude.keyPattern.test("sk-ant-api03-abcdefghijklmnopqrstuvwxyz"), true);
  assert.equal(claude.keyPattern.test("sk-abcdefghijklmnopqrstuvwxyz"), false);
});

test("모델 고르기: 엔진마다 목록(쓰레드 콘텐츠 운영과 같은 목록), 맨 앞이 기본 추천, 목록 밖 값은 기본값", async () => {
  const { AI_MODELS, resolveAiModel } = await import("../lib/aiModels.ts");
  assert.equal(AI_MODELS.openai[0].value, "gpt-4.1");
  assert.equal(AI_MODELS.claude[0].value, "claude-sonnet-5");
  assert.equal(AI_MODELS.gemini[0].value, "gemini-3.7-flash");
  assert.equal(resolveAiModel("openai", "gpt-6-astra"), "gpt-6-astra");
  assert.equal(resolveAiModel("claude", "gpt-4o"), "claude-sonnet-5");
  assert.equal(resolveAiModel("gemini", undefined), "gemini-3.7-flash");
});
