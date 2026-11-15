// 실행: node --test tests/   — M2-10 현금영수증 신청 칸 검사·표시(2026-11-15)
import { test } from "node:test";
import assert from "node:assert/strict";
import { canRequestCashReceipt, cashReceiptEnabled, maskReceiptValue, parseCashReceiptForm, purposeLabel } from "../src/lib/cash-receipt.ts";

test("신청 칸 검사 — 종류·번호", () => {
  assert.deepEqual(parseCashReceiptForm("PHONE:INCOME_DEDUCTION", "010-1234-5678"), { ok: true, type: "PHONE", purpose: "INCOME_DEDUCTION", value: "01012345678" });
  assert.deepEqual(parseCashReceiptForm("BUSINESS_REGISTRATION_NUMBER:EXPENSE_PROOF", "123-45-67890"), { ok: true, type: "BUSINESS_REGISTRATION_NUMBER", purpose: "EXPENSE_PROOF", value: "1234567890" });
  assert.equal(parseCashReceiptForm("PHONE:INCOME_DEDUCTION", "02-123-4567").ok, false);
  assert.equal(parseCashReceiptForm("BUSINESS_REGISTRATION_NUMBER:EXPENSE_PROOF", "12345").ok, false);
  assert.equal(parseCashReceiptForm("SELF:", "").ok, false);
});

test("몰 설정·신청 가능 여부", () => {
  assert.equal(cashReceiptEnabled({ cash_receipt: { enabled: true } }), true);
  assert.equal(cashReceiptEnabled({ cash_receipt: { enabled: "true" } }), false);
  assert.equal(cashReceiptEnabled(null), false);
  const o = { status: "paid", is_card: false, is_credit: false, has_tax_invoice: false };
  assert.equal(canRequestCashReceipt(o, null), true);
  assert.equal(canRequestCashReceipt({ ...o, is_card: true }, null), false);
  assert.equal(canRequestCashReceipt({ ...o, has_tax_invoice: true }, null), false);
  assert.equal(canRequestCashReceipt({ ...o, status: "cancelled" }, null), false);
  assert.equal(canRequestCashReceipt(o, { type: "PHONE", value: "010-1234-5678", purpose: "INCOME_DEDUCTION", status: "issued" }), false);
  assert.equal(canRequestCashReceipt(o, { type: "PHONE", value: "010-1234-5678", purpose: "INCOME_DEDUCTION", status: "failed" }), true);
});

test("번호 가리기·용도 이름", () => {
  assert.equal(maskReceiptValue({ type: "PHONE", value: "010-1234-5678" }), "010-****-5678");
  assert.equal(maskReceiptValue({ type: "BUSINESS_REGISTRATION_NUMBER", value: "1234567890" }), "123-**-*7890");
  assert.equal(purposeLabel("INCOME_DEDUCTION"), "소득공제");
  assert.equal(purposeLabel("EXPENSE_PROOF"), "지출증빙");
});
