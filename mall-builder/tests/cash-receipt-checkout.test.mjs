import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHECKOUT_CR_FAIL, CHECKOUT_CR_WITH_INVOICE, checkoutCashReceiptNotice, readCheckoutCashReceipt } from "../src/app/s/[store]/(shop)/order/cash-receipt-checkout.ts";

// S70(B2B-20261119-S70-FRONT) 주문서 현금영수증 — 0105 계약(195f9ba43) 연결의 모의 시험. 실제 RPC·볼타 발급·결제 0.
const fd = (o) => ({ get: (k) => (k in o ? o[k] : null) });
const SECRET = "01098765432";

test("주문 전 판단: 무통장에서 골랐을 때만 — 카드·외상·안 고름은 무시", () => {
  assert.deepEqual(readCheckoutCashReceipt(fd({}), "bank"), { kind: "none" });
  for (const pay of ["card", "credit"]) assert.deepEqual(readCheckoutCashReceipt(fd({ want_cash_receipt: "on", cr_kind: "PHONE:INCOME_DEDUCTION", cr_value: SECRET }), pay), { kind: "none" }, pay);
  assert.deepEqual(readCheckoutCashReceipt(fd({ want_cash_receipt: "on", cr_kind: "PHONE:INCOME_DEDUCTION", cr_value: "010-9876-5432" }), "bank"), { kind: "request", type: "PHONE", value: SECRET, purpose: "INCOME_DEDUCTION" });
  assert.deepEqual(readCheckoutCashReceipt(fd({ want_cash_receipt: "on", cr_kind: "BUSINESS_REGISTRATION_NUMBER:EXPENSE_PROOF", cr_value: "220-81-62517" }), "bank"), { kind: "request", type: "BUSINESS_REGISTRATION_NUMBER", value: "2208162517", purpose: "EXPENSE_PROOF" });
});

test("주문 전 판단: 세금계산서 동시 선택·형식 오류는 주문 전에 고정 문구(입력값 없음)", () => {
  assert.deepEqual(readCheckoutCashReceipt(fd({ want_cash_receipt: "on", want_invoice: "on", cr_kind: "PHONE:INCOME_DEDUCTION", cr_value: SECRET }), "bank"), { kind: "error", error: CHECKOUT_CR_WITH_INVOICE });
  for (const [kind, value] of [["PHONE:INCOME_DEDUCTION", "0212345678"], ["BUSINESS_REGISTRATION_NUMBER:EXPENSE_PROOF", "12345"], ["모름", SECRET]]) {
    const r = readCheckoutCashReceipt(fd({ want_cash_receipt: "on", cr_kind: kind, cr_value: value }), "bank");
    assert.equal(r.kind, "error", kind);
    assert.ok(!r.error.includes(value), "오류 문구에 입력값 없음");
  }
});

test("주문 후 안내: accepted=true만 성공, not_eligible·오류·빈 응답은 같은 고정 안내(원문·번호 없음)", () => {
  assert.equal(checkoutCashReceiptNotice({ data: { accepted: true }, error: null }), null);
  for (const res of [
    { data: { accepted: false, reason: "not_eligible" }, error: null },
    { data: null, error: { message: `휴대폰 번호 ${SECRET} 볼타 원문 500` } },
    { data: { accepted: true }, error: { message: "x" } },
    { data: null, error: null },
    { data: "accepted", error: null },
  ]) {
    const n = checkoutCashReceiptNotice(res);
    assert.equal(n, CHECKOUT_CR_FAIL);
    assert.ok(!n.includes(SECRET) && !n.includes("볼타") && !n.includes("not_eligible"));
  }
});

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const actions = read("../src/app/s/[store]/(shop)/order/actions.ts");
const form = read("../src/app/s/[store]/(shop)/order/order-form.tsx");
const page = read("../src/app/s/[store]/(shop)/order/page.tsx");
const quotePage = read("../src/app/s/[store]/(shop)/quotes/[id]/page.tsx");

test("서버 액션 계약: 주문 전 검사 → 주문 생성 → 0105 1회(0100 직접 호출·재시도·원문 출력 없음) → 고정 안내로 상세", () => {
  const iCheck = actions.indexOf("readCheckoutCashReceipt(form, payMethod)");
  const iPlace = actions.indexOf('rpc("mall_builder_place_order_v2"');
  const iCr = actions.indexOf('rpc("mall_builder_cash_receipt_checkout"');
  assert.ok(iCheck > 0 && iCheck < iPlace && iPlace < iCr, "검사 → 주문 → 접수 순서");
  assert.equal(actions.split('rpc("mall_builder_cash_receipt_checkout"').length, 2, "0105 호출 1곳");
  assert.ok(!actions.includes("mall_builder_cash_receipt_request"), "0100 신청 직접 호출 없음(즉시 발급 경로 금지)");
  assert.ok(!/console\./.test(actions), "로그 출력 없음");
  assert.ok(!/from\("mall_builder_orders"\)/.test(actions), "앱 선조회 없음(판정은 DB 행 잠금 아래)");
  assert.match(actions, /if \(cashReceiptNotice\) redirect\(`\/s\/\$\{slug\}\/orders\/\$\{row\.order_id\}\?done=1&error=\$\{encodeURIComponent\(cashReceiptNotice\)\}`\)/);
  assert.match(actions, /if \(cashReceipt\.kind === "error"\) return \{ \.\.\.values, error: cashReceipt\.error \};/);
});

test("화면: 장바구니 주문·몰 설정·무통장·1원 이상일 때만 칸, 세금계산서와 택1, 견적 주문은 칸 없음", () => {
  assert.match(form, /\{cashReceipt && payMethod === "bank" && t\.total > 0 && \(/);
  assert.match(form, /if \(e\.target\.checked\) setWantInvoice\(false\)/);
  assert.match(form, /if \(e\.target\.checked\) setWantCashReceipt\(false\)/);
  for (const n of ['name="want_cash_receipt"', 'name="cr_kind"', 'name="cr_value"']) assert.ok(form.includes(n), n);
  assert.match(page, /cashReceipt=\{cashReceiptEnabled\(store\.settings\)\}/);
  assert.ok(!quotePage.includes("cashReceipt="), "견적 주문은 다른 액션이라 칸을 넘기지 않음");
});
