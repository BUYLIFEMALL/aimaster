import { test } from "node:test";
import assert from "node:assert/strict";
import { validateInvoiceEmail, canRequestInvoice } from "../src/lib/taxInvoice.ts";

test("받을 메일", () => {
  assert.deepEqual(validateInvoiceEmail(" tax@buylife.kr "), { ok: true, value: "tax@buylife.kr" });
  assert.match(validateInvoiceEmail("").error, /입력/);
  assert.match(validateInvoiceEmail("tax@").error, /확인/);
});

test("요청 가능한 주문", () => {
  assert.equal(canRequestInvoice({ status: "pending_payment", tax_invoice: null }), true);
  assert.equal(canRequestInvoice({ status: "confirmed", tax_invoice: null }), true);
  assert.equal(canRequestInvoice({ status: "cancelled", tax_invoice: null }), false);
  assert.equal(canRequestInvoice({ status: "paid", tax_invoice: { status: "requested" } }), false);
});

import { taxInvoiceButtons, TAX_INVOICE_LABEL } from "../src/lib/taxInvoice.ts";
test("D19 운영자 버튼 — 요청·실패면 발행, 접수·모름이면 확인만, 완료면 수정 발행, 카드는 없음", () => {
  const req = { status: "requested" };
  assert.deepEqual(taxInvoiceButtons(req, { status: "paid", is_card: false }, true), { issue: true, recheck: false, amend: false, markManual: true, reason: null });
  assert.equal(taxInvoiceButtons(req, { status: "paid", is_card: false }, false).issue, false);
  assert.match(taxInvoiceButtons(req, { status: "paid", is_card: false }, false).reason, /홈택스/);
  assert.match(taxInvoiceButtons(req, { status: "paid", is_card: true }, true).reason, /매출전표/);
  assert.equal(taxInvoiceButtons(req, { status: "cancelled", is_card: false }, true).issue, false);
  const unknown = { status: "unknown", provider: "bolta" };
  assert.deepEqual(taxInvoiceButtons(unknown, { status: "paid", is_card: false }, true), { issue: false, recheck: true, amend: false, markManual: false, reason: null });
  assert.equal(taxInvoiceButtons({ status: "failed", provider: "bolta" }, { status: "paid", is_card: false }, true).issue, true);
  const issued = { status: "issued", provider: "bolta" };
  assert.equal(taxInvoiceButtons(issued, { status: "cancelled", is_card: false }, true).amend, true);
  assert.equal(taxInvoiceButtons({ ...issued, terminated: true }, { status: "cancelled", is_card: false }, true).amend, false);
  assert.equal(taxInvoiceButtons({ ...issued, amendments: [{ status: "unknown" }] }, { status: "paid", is_card: false }, true).amend, false);
  assert.equal(TAX_INVOICE_LABEL.unknown, "결과 확인 필요");
});

