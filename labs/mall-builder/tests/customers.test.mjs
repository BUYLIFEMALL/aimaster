import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeMobile, validateCustomer, validateAddress, maskEmail } from "../src/lib/customers.ts";

test("휴대폰 번호 정리 — 휴대폰만", () => {
  assert.equal(normalizeMobile("01012345678"), "010-1234-5678");
  assert.equal(normalizeMobile("010-123-4567"), "010-123-4567");
  assert.equal(normalizeMobile(" 011 1234 5678 "), "011-1234-5678");
  assert.equal(normalizeMobile("0212345678"), null);
  assert.equal(normalizeMobile("1644-3686"), null);
  assert.equal(normalizeMobile(""), null);
});

test("손님 정보", () => {
  const r = validateCustomer({ name: " 홍길동 ", phone: "01012345678", marketing_agree: "on" });
  assert.deepEqual(r, { ok: true, value: { name: "홍길동", phone: "010-1234-5678", marketing_agree: true } });
  assert.equal(validateCustomer({ name: "", phone: "01012345678" }).ok, false);
  assert.equal(validateCustomer({ name: "홍", phone: "021234567" }).ok, false);
  assert.equal(validateCustomer({ name: "홍", phone: "01012345678" }).ok && validateCustomer({ name: "홍", phone: "01012345678" }).value.marketing_agree, false);
});

test("배송지", () => {
  const ok = { receiver: "홍길동", phone: "01012345678", zip: "06236", addr1: "서울 강남구 테헤란로 1", addr2: "101호" };
  const r = validateAddress(ok);
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.value.label, "배송지");
  assert.equal(r.ok && r.value.phone, "010-1234-5678");
  assert.match(validateAddress({ ...ok, zip: "1234" }).error, /우편번호/);
  assert.match(validateAddress({ ...ok, receiver: "" }).error, /받는 분/);
  assert.match(validateAddress({ ...ok, addr1: "" }).error, /주소/);
  assert.match(validateAddress({ ...ok, phone: "02-123-4567" }).error, /휴대폰/);
});

test("이메일 가리기", () => {
  assert.equal(maskEmail("buylifemall@gmail.com"), "bu*********@gmail.com");
  assert.equal(maskEmail("ab@x.com"), "ab*@x.com");
});
