// 감시 대상 → 실거래 목록 바로가기(2026-10-30)
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTradeListLink, TRADE_LIST_URL } from "../lib/tradeLink.ts";

test("지역 감시: 네이버 지역 코드 앞 5자리로 거름", () => {
  const u = new URL(buildTradeListLink({ target_type: "region", cortar_no: "4128510300", complex_name: null })!);
  assert.equal(u.origin + u.pathname, TRADE_LIST_URL);
  assert.equal(u.searchParams.get("district"), "41285");
  assert.equal(u.searchParams.get("q"), null);
  assert.equal(buildTradeListLink({ target_type: "region", cortar_no: null, complex_name: null }), null);
});

test("단지 감시: 단지 이름으로 거르고 전화번호 꼴 숫자는 지움", () => {
  const u = new URL(buildTradeListLink({ target_type: "complex", cortar_no: null, complex_name: "백송건영 010-1234-5678" })!);
  assert.equal(u.searchParams.get("q"), "백송건영");
  assert.equal(buildTradeListLink({ target_type: "complex", cortar_no: null, complex_name: "" }), null);
});
