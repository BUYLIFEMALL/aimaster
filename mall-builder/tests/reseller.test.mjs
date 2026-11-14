import { test } from "node:test";
import assert from "node:assert/strict";
import { codeError, commissionOf, normalizeCode, parseRate, payoutError, refCookieName, refHeaderFromCookies, withholdingHint } from "../src/lib/reseller.ts";

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
  assert.deepEqual(parseRate("0"), { ok: true, value: 0 }); // 0071부터 0% 허용(추가율)
  assert.equal(parseRate("").ok, false);
  assert.equal(parseRate("-1").ok, false);
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

test("refHeaderFromCookies — 몰별 리셀러 쿠키를 머리글 한 줄로(M1-5 0072)", () => {
  assert.equal(refHeaderFromCookies([]), null);
  assert.equal(refHeaderFromCookies([{ name: "sb-x", value: "y" }, { name: "mb_ref_scn", value: "bad code!" }]), null);
  assert.equal(refHeaderFromCookies([{ name: "mb_ref_scn", value: "rslr01" }, { name: "mb_ref_aimaster-b2b", value: "OWNER1" }]), "scn=RSLR01;aimaster-b2b=OWNER1");
  assert.equal(refHeaderFromCookies([{ name: "mb_ref_" + "a".repeat(61), value: "RSLR01" }]), null);
  assert.equal(refHeaderFromCookies([{ name: refCookieName("scn"), value: "RSLR01" }]), "scn=RSLR01");
});
