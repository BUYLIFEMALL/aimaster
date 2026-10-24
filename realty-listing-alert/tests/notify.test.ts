// 카톡·이메일 받기(2026-10-25) 순수 함수 시험 — node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildKakaoText } from "../extension/lib/notify.js";

const ev = (type: string) => ({ type, item: {} });

test("카톡 요약: 건수·단지 이름·파일 안내, 200자 안", () => {
  const text = buildKakaoText([
    { name: "백송건영", total: 20, events: [ev("new"), ev("new"), ev("priceDown")], firstRun: false },
    { name: "백송대림", total: 30, events: [ev("gone")], firstRun: false },
  ]);
  assert.match(text, /^🏠 \[매물 알림\] 🆕 신규 2 · 📉 가격 내림 1 · 👋 사라짐 1/);
  assert.match(text, /백송건영 외 1곳/);
  assert.match(text, /엑셀은 텔레그램·이메일로/);
  assert.ok(text.length <= 200);
});

test("카톡 요약: 첫 수집·긴 이름도 200자를 넘지 않는다", () => {
  const text = buildKakaoText([{ name: "가".repeat(400), total: 0, events: [], firstRun: true }]);
  assert.ok(text.length <= 200);
  assert.match(text, /변동 없음/);
});
