import { test } from "node:test";
import assert from "node:assert/strict";
import { displayStatus, validateAnswer, validateSendItems, addDays, todayKst } from "../src/lib/quotes.ts";

test("한국 날짜 — 자정 넘김", () => {
  assert.equal(todayKst(new Date("2026-11-03T15:30:00Z")), "2026-11-04");
  assert.equal(todayKst(new Date("2026-11-03T14:59:00Z")), "2026-11-03");
});

test("기한 지남 — 회신 견적만, 그날까지는 유효", () => {
  assert.equal(displayStatus("answered", "2026-11-10", "2026-11-10"), "answered");
  assert.equal(displayStatus("answered", "2026-11-09", "2026-11-10"), "expired");
  assert.equal(displayStatus("accepted", "2026-11-01", "2026-11-10"), "accepted");
  assert.equal(displayStatus("requested", null, "2026-11-10"), "requested");
});

test("회신 검사", () => {
  const ok = validateAnswer([{ id: "a", price: "40,000원" }, { id: "b", price: "0" }], "2026-11-11", "2026-11-04");
  assert.deepEqual(ok, { ok: true, value: { items: [{ id: "a", price: 40000 }, { id: "b", price: 0 }], valid_until: "2026-11-11" } });
  assert.match(validateAnswer([{ id: "a", price: "" }], "2026-11-11", "2026-11-04").error, /견적가/);
  assert.match(validateAnswer([{ id: "a", price: "1" }], "2026-11-03", "2026-11-04").error, /오늘 이후/);
  assert.match(validateAnswer([{ id: "a", price: "1" }], "2027-03-01", "2026-11-04").error, /90일/);
  assert.match(validateAnswer([], "2026-11-11", "2026-11-04").error, /품목/);
});

test("운영자 발송 견적 품목 검사", () => {
  const opt = (id) => id === "P2";
  assert.match(validateSendItems([{ product_id: "", variant_id: "", qty: "", price: "" }], opt).error, /1개 이상/);
  assert.match(validateSendItems([{ product_id: "P2", variant_id: "", qty: 1, price: 1 }], opt).error, /1번째 품목의 옵션/);
  assert.match(validateSendItems([{ product_id: "P1", variant_id: "", qty: 0, price: 1 }], opt).error, /수량은 1~999/);
  assert.match(validateSendItems([{ product_id: "P1", variant_id: "", qty: 1, price: "-5" }], opt).error, /견적가/);
  assert.match(
    validateSendItems([{ product_id: "P1", variant_id: "", qty: 1, price: 100 }, { product_id: "P1", variant_id: "", qty: 1, price: 200 }], opt).error,
    /견적가가 다릅니다/,
  );
  const ok = validateSendItems(
    [
      { product_id: "P1", variant_id: "", qty: "2개", price: "10,000원" },
      { product_id: "", variant_id: "", qty: "", price: "" }, // 빈 줄은 무시
      { product_id: "P1", variant_id: "", qty: 3, price: 10000 }, // 같은 상품은 합침
      { product_id: "P2", variant_id: "V1", qty: 1, price: 0 },
    ],
    opt,
  );
  assert.deepEqual(ok.value, [
    { product_id: "P1", variant_id: null, qty: 5, price: 10000 },
    { product_id: "P2", variant_id: "V1", qty: 1, price: 0 },
  ]);
});

test("날짜 더하기", () => {
  assert.equal(addDays("2026-11-28", 7), "2026-12-05");
});
