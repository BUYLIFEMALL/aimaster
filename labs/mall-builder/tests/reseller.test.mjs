import { test } from "node:test";
import assert from "node:assert/strict";
import { codeError, commissionOf, normalizeCode, parseRate, payoutError, refCookieName, withholdingHint } from "../src/lib/reseller.ts";

test("코드", () => {
  assert.equal(normalizeCode(" gana01 "), "GANA01");
  assert.equal(codeError("GANA01"), null);
  assert.ok(codeError("AB"));
  assert.ok(codeError("가나다라"));
  assert.ok(codeError("ABCDEFGHIJKLM"));
});

test("수수료율", () => {
  assert.deepEqual(parseRate("5"), { ok: true, value: 5 });
  assert.deepEqual(parseRate("3.456"), { ok: true, value: 3.46 });
  assert.equal(parseRate("0").ok, false);
  assert.equal(parseRate("51").ok, false);
  assert.equal(parseRate("x").ok, false);
});

test("수수료 = (결제 − 배송비) × 율, 내림", () => {
  assert.equal(commissionOf(84600, 3000, 5), 4080);
  assert.equal(commissionOf(3000, 3000, 5), 0);
  assert.equal(commissionOf(1000, 3000, 5), 0);
  assert.equal(commissionOf(33333, 0, 3.3), 1099);
});

test("출금 검사·원천징수 안내·쿠키 이름", () => {
  assert.ok(payoutError(9999, 50000));
  assert.ok(payoutError(60000, 50000));
  assert.equal(payoutError(50000, 50000), null);
  assert.equal(withholdingHint(100000), 3300);
  assert.equal(refCookieName("aimaster-b2b"), "mb_ref_aimaster-b2b");
});
