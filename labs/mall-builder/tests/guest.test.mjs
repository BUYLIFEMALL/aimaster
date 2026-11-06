import { test } from "node:test";
import assert from "node:assert/strict";
import { addLine, guestOrderEnabled, parseCart, removeLine, serializeCart, setLineQty, validateGuestOrder, validateLookup, MAX_GUEST_LINES } from "../src/lib/guest.ts";

const P = "efd29fd6-2947-4945-8c48-3e25412038cf";
const V = "11111111-2222-4333-8444-555555555555";

test("몰 설정 읽기", () => {
  assert.equal(guestOrderEnabled({ guest_order: true }), true);
  assert.equal(guestOrderEnabled({ guest_order: "true" }), false);
  assert.equal(guestOrderEnabled(null), false);
  assert.equal(guestOrderEnabled({}), false);
});

test("쿠키 장바구니 읽기·쓰기", () => {
  assert.deepEqual(parseCart(undefined), []);
  assert.deepEqual(parseCart("뭔가 이상한 글"), []);
  assert.deepEqual(parseCart(JSON.stringify([{ p: P, v: null, q: 2 }, { p: "bad", q: 1 }, { p: P, v: V, q: 0 }, { p: P, v: V, q: 3.5 }])), [{ p: P, v: null, q: 2 }]);
  const many = Array.from({ length: 30 }, () => ({ p: P, v: null, q: 1 }));
  assert.equal(parseCart(JSON.stringify(many)).length, MAX_GUEST_LINES);
  assert.equal(serializeCart([{ p: P, v: V, q: 1 }]), JSON.stringify([{ p: P, v: V, q: 1 }]));
});

test("줄 더하기·바꾸기·빼기", () => {
  let r = addLine([], P, null, 2);
  assert.ok(r.ok && r.qty === 2 && r.lines.length === 1);
  r = addLine(r.lines, P, null, 3);
  assert.ok(r.ok && r.qty === 5 && r.lines.length === 1); // 같은 줄은 수량 합침
  r = addLine(r.lines, P, V, 1);
  assert.ok(r.ok && r.lines.length === 2);
  assert.match(addLine(r.lines, P, null, 995).error, /999/);
  const full = Array.from({ length: MAX_GUEST_LINES }, (_, i) => ({ p: P.slice(0, -2) + String(i).padStart(2, "0"), v: null, q: 1 }));
  assert.match(addLine(full, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", null, 1).error, /20줄/);
  assert.deepEqual(setLineQty(r.lines, 1, 7)[1].q, 7);
  assert.equal(removeLine(r.lines, 0).length, 1);
});

test("비회원 주문서 입력 검사", () => {
  const base = { guest_name: "홍길동", guest_phone: "01012345678", guest_email: "", receiver: "홍길동", phone: "010-1234-5678", zip: "06236", addr1: "서울 강남구 테헤란로 1", addr2: "", depositor: "", memo: "" };
  const ok = validateGuestOrder(base);
  assert.ok(ok.ok);
  assert.equal(ok.value.guest.phone, "010-1234-5678");
  assert.equal(ok.value.depositor, "홍길동"); // 입금자명 비우면 이름
  assert.match(validateGuestOrder({ ...base, guest_name: "" }).error, /이름/);
  assert.match(validateGuestOrder({ ...base, guest_phone: "02-123-4567" }).error, /휴대폰/);
  assert.match(validateGuestOrder({ ...base, guest_email: "not-mail" }).error, /이메일/);
  assert.equal(validateGuestOrder({ ...base, guest_email: "A@B.co" }).value.guest.email, "a@b.co");
  assert.match(validateGuestOrder({ ...base, zip: "123" }).error, /우편번호/);
  assert.match(validateGuestOrder({ ...base, addr1: "a" }).error, /주소/);
  assert.match(validateGuestOrder({ ...base, memo: "가".repeat(201) }).error, /200자/);
});

test("주문 조회 입력 검사", () => {
  assert.match(validateLookup({ order_no: "123", phone: "01012345678" }).error, /주문번호/);
  assert.match(validateLookup({ order_no: "20261106-0001", phone: "123" }).error, /휴대폰/);
  assert.deepEqual(validateLookup({ order_no: " 20261106-0001 ", phone: "010 1234 5678" }).value, { orderNo: "20261106-0001", phone: "010-1234-5678" });
});
