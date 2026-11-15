// 실행: node --test tests/   — M2-7 반품·환불 규칙(2026-11-15)
import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultReturnFee, maskAccount, needsRefundAccount, parseReturnFee, reasonLabel, storeReturnFee } from "../src/lib/returns.ts";

test("반품비 기본값: 변심·기타는 몰 설정값, 불량·오배송은 0, 결제 금액을 넘지 않음", () => {
  assert.equal(defaultReturnFee("change_mind", 6000, 30000), 6000);
  assert.equal(defaultReturnFee("other", 6000, 30000), 6000);
  assert.equal(defaultReturnFee("defect", 6000, 30000), 0);
  assert.equal(defaultReturnFee("wrong_item", 6000, 30000), 0);
  assert.equal(defaultReturnFee("change_mind", 6000, 4000), 4000);
  assert.equal(defaultReturnFee(null, 3000, 10000), 3000);
});

test("몰 설정 반품비 칸: 빈 값 0, 쉼표·원 허용, 10만 원까지", () => {
  assert.deepEqual(parseReturnFee(""), { ok: true, value: 0 });
  assert.deepEqual(parseReturnFee("6,000원"), { ok: true, value: 6000 });
  assert.equal(parseReturnFee("-1").ok, false);
  assert.equal(parseReturnFee("abc").ok, false);
  assert.equal(parseReturnFee("100001").ok, false);
  assert.equal(storeReturnFee({ return_fee: 6000 }), 6000);
  assert.equal(storeReturnFee({ return_fee: "x" }), 0);
  assert.equal(storeReturnFee(null), 0);
});

test("환불 계좌는 무통장 주문만, 계좌는 뒤 4자리만 보임", () => {
  assert.equal(needsRefundAccount({ is_card: false, is_credit: false }), true);
  assert.equal(needsRefundAccount({ is_card: true, is_credit: false }), false);
  assert.equal(needsRefundAccount({ is_card: false, is_credit: true }), false);
  assert.equal(maskAccount("123-456-7890"), "******7890");
  assert.equal(maskAccount("12"), "****");
  assert.equal(reasonLabel("defect"), "상품 불량·파손");
  assert.equal(reasonLabel("x"), "");
});
