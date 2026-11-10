import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBaseRate, parseEndsOn, parseSpecialPrice, specialText } from "../src/lib/customerPrices.ts";

test("D24 특가 값 — 금액·할인율, 빈칸·형식 오류", () => {
  assert.deepEqual(parseSpecialPrice("23,000원"), { ok: true, value: { price: 23000, discount_rate: null } });
  assert.deepEqual(parseSpecialPrice("5%"), { ok: true, value: { price: null, discount_rate: 5 } });
  assert.equal(parseSpecialPrice("").ok, false);
  assert.match(parseSpecialPrice("abc").error, /특가/);
  assert.equal(parseSpecialPrice("100%").ok, false);
});

test("D24 기본 할인율 — 1~99%, 비우면 지움", () => {
  assert.deepEqual(parseBaseRate("7%"), { ok: true, value: 7 });
  assert.deepEqual(parseBaseRate(""), { ok: true, value: null });
  assert.equal(parseBaseRate("0").ok, false);
  assert.equal(parseBaseRate("100").ok, false);
  assert.equal(parseBaseRate("3000").ok, false);
});

test("D24 끝나는 날 — 비우면 계속, 지난 날·형식 오류 거부", () => {
  assert.deepEqual(parseEndsOn("", "2026-11-10"), { ok: true, value: null });
  assert.deepEqual(parseEndsOn("2026-11-10", "2026-11-10"), { ok: true, value: "2026-11-10" });
  assert.match(parseEndsOn("2026-11-09", "2026-11-10").error, /지났/);
  assert.equal(parseEndsOn("11/30", "2026-11-10").ok, false);
});

test("D24 특가 표시 글자", () => {
  assert.equal(specialText({ price: 23000, discount_rate: null }), "23,000원");
  assert.equal(specialText({ price: null, discount_rate: 5 }), "5% 할인");
});
