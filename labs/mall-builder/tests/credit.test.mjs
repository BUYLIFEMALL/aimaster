import { test } from "node:test";
import assert from "node:assert/strict";
import { creditAvailable, canUseCredit, validateLedgerEntry, parseCreditLimit } from "../src/lib/credit.ts";

test("남은 한도와 사용 가능 여부", () => {
  assert.equal(creditAvailable(1000000, 300000), 700000);
  assert.equal(creditAvailable(100, 300), 0);
  assert.equal(canUseCredit(1000000, 300000, 700000), true);
  assert.equal(canUseCredit(1000000, 300000, 700001), false);
  assert.equal(canUseCredit(0, 0, 1000), false); // 한도 없음
});

test("장부 입력 — 입금은 −로 기록, 조정은 사유 필수", () => {
  assert.deepEqual(validateLedgerEntry("payment", "200,000원", ""), { ok: true, value: { kind: "payment", amount: -200000, note: "" } });
  assert.match(validateLedgerEntry("payment", "-5", "").error, /양수/);
  assert.match(validateLedgerEntry("adjust", "5000", "").error, /사유/);
  assert.deepEqual(validateLedgerEntry("adjust", "-5000", "반품 차감"), { ok: true, value: { kind: "adjust", amount: -5000, note: "반품 차감" } });
  assert.match(validateLedgerEntry("charge", "1", "x").error, /입금 또는 조정/);
  assert.match(validateLedgerEntry("payment", "0", "").error, /0이 아닌/);
});

test("한도 칸", () => {
  assert.deepEqual(parseCreditLimit(""), { ok: true, value: 0 });
  assert.deepEqual(parseCreditLimit("1,000,000"), { ok: true, value: 1000000 });
  assert.equal(parseCreditLimit("-1").ok, false);
});
