// 아침 요약·정리 규칙·AI 추천 정리(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanChannels, cleanHour, cleanupBefore, kstDate, cleanUrgentHours, hourLabel, summaryMessage, urgentMessage, urgentRunKey } from "../src/lib/coupang/summary.ts";
import { cleanUrgent, normalizePrefs } from "../src/lib/coupang/prefs.ts";
import { cleanSuggestion } from "../src/lib/coupang/suggest.ts";
import { AI_MODEL_OPTIONS, AI_PROVIDERS, DEFAULT_AI_MODELS, missingKeyMessage, providerOfModel } from "../src/lib/ai/models.ts";

const NOW = Date.parse("2026-10-31T23:30:00+09:00");
const counts = { accept: { count: 2, more: false }, instruct: { count: 50, more: true }, stopRequests: { count: 1, more: false }, returnsReceived: { count: 0, more: false }, inquiries: { count: 0, more: false }, exchanges: { error: "x" }, from: "a", to: "b" };

test("요약은 건수만 담고 급한 건을 표시한다", () => {
  const m = summaryMessage(counts, NOW);
  assert.match(m, /2026-10-31/);
  assert.match(m, /🚨 출고중지 요청 1건/);
  assert.match(m, /▫ 미답변 문의 0건/);
  assert.match(m, /상품준비중 50\+건/);
  assert.match(m, /교환 확인 실패/);
  assert.match(m, /직접 확인/);
});

test("AI 모델 선택", () => {
  assert.equal(providerOfModel("claude-opus-5-5"), "anthropic");
  assert.equal(providerOfModel("gpt-4.1"), "openai");
  assert.equal(providerOfModel("gemini-3.7-flash"), "gemini");
  assert.equal(providerOfModel("없는모델"), null);
  for (const p of AI_PROVIDERS) assert.ok(AI_MODEL_OPTIONS.some((o) => o.provider === p && o.value === DEFAULT_AI_MODELS[p]));
  assert.match(missingKeyMessage("gemini"), /Gemini/);
});

test("받을 곳과 메일 본문", () => {
  assert.deepEqual(cleanChannels(["kakao", "x", "telegram"]), ["telegram", "kakao"]);
  assert.deepEqual(cleanChannels(null), []);
});

test("시각·날짜·정리 기준", () => {
  assert.equal(cleanHour(9), 9);
  assert.equal(cleanHour(24), 8);
  assert.equal(cleanHour("x"), 8);
  assert.equal(kstDate(Date.parse("2026-10-31T15:30:00Z")), "2026-11-01");
  assert.equal(cleanupBefore(Date.parse("2026-10-31T00:00:00Z")), "2026-10-01T00:00:00.000Z");
});

test("AI 추천은 허용 값만 남기고 태그를 정리한다", () => {
  const attrs = [{ name: "계절", values: ["봄", "겨울"] }, { name: "소재", values: [] }];
  const r = cleanSuggestion({ tags: [" 가방 ", "가방", "x".repeat(30), "백팩"], attributes: [{ name: "계절", value: "여름" }, { name: "계절", value: "겨울" }, { name: "소재", value: "나일론" }, { name: "없는칸", value: "값" }] }, attrs);
  assert.deepEqual(r.tags, ["가방", "백팩"]);
  assert.deepEqual(r.attributes, { 계절: "겨울", 소재: "나일론" });
  assert.deepEqual(cleanSuggestion(null, attrs), { tags: [], attributes: {} });
});

test("S1 아침 요약에 키 만료 안내", () => {
  const empty = { accept: { count: 0 }, instruct: { count: 0 }, stopRequests: { count: 0 }, returnsReceived: { count: 0 }, inquiries: { count: 0 }, exchanges: { count: 0 } };
  assert.match(summaryMessage(empty, Date.now(), "키 만료 예정"), /🔑 키 만료 예정/);
  assert.doesNotMatch(summaryMessage(empty, Date.now()), /🔑/);
});

test("수시 알림은 늘어난 항목만 보낸다", () => {
  const m = urgentMessage({ stop: 1, inquiries: 2 }, { stop: 3, inquiries: 2 });
  assert.match(m, /출고중지 요청 3건\(새로 2건\)/);
  assert.doesNotMatch(m, /미답변/);
  assert.equal(urgentMessage({ stop: 3, inquiries: 2 }, { stop: 3, inquiries: 1 }), "");
});

test("수시 알림은 못 읽은 항목을 비교하지 않고, 처음이면 0에서 비교한다", () => {
  assert.equal(urgentMessage({ stop: 1, inquiries: 1 }, { stop: null, inquiries: null }), "");
  assert.match(urgentMessage({ stop: null, inquiries: null }, { stop: 1, inquiries: 0 }), /새로 1건/);
  assert.equal(urgentMessage({ stop: null, inquiries: null }, { stop: 0, inquiries: 0 }), "");
});

test("수시 알림 시간 표시는 한국 시간 기준 시간 단위다", () => {
  assert.equal(urgentRunKey(NOW), "2026-10-31T23");
});

test("수시 알림 설정을 정리하고 기본은 꺼짐이다", () => {
  assert.equal(normalizePrefs({}).urgent.enabled, false);
  const u = cleanUrgent({ enabled: true, hours: [10, 99, "x"], channels: ["telegram", "bad"], stop: -1, inquiries: 2 });
  assert.deepEqual([u.hours, u.channels, u.stop, u.inquiries], [[10], ["telegram"], null, 2]);
});

test("수시 알림 시각은 회원이 고른 값을 정리해 쓴다", () => {
  assert.deepEqual(cleanUrgentHours([18, 9, 9, 24, -1, "x", 1.5]), [9, 18]);
  assert.equal(cleanUrgentHours([0, 1, 2, 3, 4, 5, 6, 7]).length, 6);
  assert.deepEqual(cleanUrgentHours(null), []);
});

test("시각을 쉬운 말로 보여 준다", () => {
  assert.deepEqual([0, 9, 12, 18].map(hourLabel), ["밤 12시", "오전 9시", "낮 12시", "오후 6시"]);
});
