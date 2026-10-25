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
  assert.match(text, /^🏠 \[매물 알림\] 신규 2 · 가격 내림 1 · 사라짐 1/);
  assert.ok(!/🆕|📉|👋/.test(text)); // 카톡은 그림문자 없이
  assert.match(text, /백송건영 외 1곳/);
  assert.match(text, /엑셀은 텔레그램·이메일로/);
  assert.ok(text.length <= 200);
});

test("카톡 요약: 첫 수집·긴 이름도 200자를 넘지 않는다", () => {
  const text = buildKakaoText([{ name: "가".repeat(400), total: 0, events: [], firstRun: true }]);
  assert.ok(text.length <= 200);
  assert.match(text, /변동 없음/);
});

test("메일 제목: 건수와 매물 수가 먼저 보인다", async () => {
  const { buildMailSubject } = await import("../extension/lib/notify.js");
  const now = new Date("2026-10-25T06:03:00Z");
  const subject = buildMailSubject([
    { name: "A", total: 20, events: [ev("new"), ev("new"), ev("priceDown")], firstRun: false },
    { name: "B", total: 30, events: [], firstRun: false },
  ], { now });
  assert.match(subject, /^🏠 \[매물 알림\] 신규 2 · 가격 내림 1 · 매물 50건 \(/);
  assert.match(buildMailSubject([{ name: "A", total: 5, events: [], firstRun: false }], { now }), /변동 없음 · 매물 5건/);
});

test("메일 HTML: 단지·변동 표가 들어가고 매물 글자는 이스케이프된다", async () => {
  const { buildMailHtml } = await import("../extension/lib/notify.js");
  const html = buildMailHtml([{ name: "<script>x</script>단지", total: 3, firstRun: false, events: [{ type: "priceDown", prevPriceText: "9억", item: { tradeName: "매매", priceText: "8억", area: 84, dong: "101동", floor: "5/15", realtor: "가부동산", complexNo: "123", no: "456" } }] }]);
  assert.ok(!html.includes("<script>x"));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /이전 9억/);
  assert.match(html, /new\.land\.naver\.com/);
  assert.match(html, /통계·변동 기록 보기/);
});
