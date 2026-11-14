// EC-W10 공장 견적 비교 순수 함수 시험(AI 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { cheapestFactory, fileKind, isExcel, marginCalcUrl, normalizeCurrency, sanitizeReport } from "../lib/factoryQuotes.ts";

test("파일 종류: PDF·사진·CSV/TXT만, 엑셀은 따로 안내", () => {
  assert.equal(fileKind("견적.PDF", ""), "pdf");
  assert.equal(fileKind("wechat.png", "image/png"), "image");
  assert.equal(fileKind("quote.csv", ""), "sheet");
  assert.equal(fileKind("quote.xlsx", ""), null);
  assert.equal(isExcel("quote.xlsx"), true);
  assert.equal(fileKind("a.exe", "application/octet-stream"), null);
});

test("통화 표기 맞추기", () => {
  assert.equal(normalizeCurrency("rmb"), "CNY");
  assert.equal(normalizeCurrency("US$"), "USD");
  assert.equal(normalizeCurrency("원"), "KRW");
  assert.equal(normalizeCurrency("gbp"), "GBP");
});

test("AI 결과 다시 정리: 숫자 범위·빈 구간·개수 제한·이름 없는 공장", () => {
  const r = sanitizeReport({
    product_name: " 캠핑의자 ",
    factories: [
      { factory_name: "", currency: "RMB", unit_price: "23.5", tiers: [{ min_qty: 1000, price: 21 }, { min_qty: 0, price: 5 }], moq: 500, sample_lead_days: 7.4, production_lead_days: 5000 },
      { factory_name: "B", currency: "USD", unit_price: -1 },
    ],
    unconfirmed: ["KC 인증", ""],
    pending: [{ date: "11/02", factory_name: "A", question: "" }, { question: "칼선 파일" }],
    next_questions: Array.from({ length: 9 }, () => ({ ko: "질문" })),
    summary: "요약",
  });
  assert.equal(r.product_name, "캠핑의자");
  assert.equal(r.factories[0].factory_name, "이름 모름");
  assert.equal(r.factories[0].currency, "CNY");
  assert.equal(r.factories[0].unit_price, 23.5);
  assert.deepEqual(r.factories[0].tiers, [{ min_qty: 1000, price: 21 }]);
  assert.equal(r.factories[0].sample_lead_days, 7);
  assert.equal(r.factories[0].production_lead_days, null);
  assert.equal(r.factories[1].unit_price, null);
  assert.deepEqual(r.unconfirmed, ["KC 인증"]);
  assert.equal(r.pending.length, 1);
  assert.equal(r.next_questions.length, 6);
  assert.equal(sanitizeReport(null).factories.length, 0);
});

test("최저 단가 공장: 같은 통화일 때만", () => {
  const f = (factory_name, currency, unit_price) => ({ factory_name, currency, unit_price });
  assert.equal(cheapestFactory([f("A", "USD", 3.5), f("B", "USD", 3.2)]), "B");
  assert.equal(cheapestFactory([f("A", "USD", 3.5), f("B", "CNY", 20)]), null);
  assert.equal(cheapestFactory([f("A", "USD", 3.5)]), null);
});

test("마진 계산 연결 주소: 계산기가 받는 통화만", () => {
  const url = new URL(marginCalcUrl({ currency: "CNY", unit_price: 23.5 }, "캠핑의자"), "https://x.test");
  assert.equal(url.pathname, "/sourcing");
  assert.equal(url.searchParams.get("fxCurrency"), "CNY");
  assert.equal(url.searchParams.get("fxAmount"), "23.5");
  assert.equal(url.searchParams.get("keyword"), "캠핑의자");
  assert.equal(marginCalcUrl({ currency: "KRW", unit_price: 1000 }), null);
  assert.equal(marginCalcUrl({ currency: "USD", unit_price: null }), null);
});
