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
