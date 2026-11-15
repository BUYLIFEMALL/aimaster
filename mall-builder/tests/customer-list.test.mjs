// 실행: node --test tests/   — M2-8 운영사 유저 목록 조건·엑셀 한 줄(2026-11-15)
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyCustomerFilters, customerListHref, customerPageCount, customerSearchFilter, parseCustomerListQuery } from "../src/lib/customer-list.ts";
import { CUSTOMER_EXPORT_HEADERS, customerExportRow } from "../src/lib/customer-excel.ts";

test("주소 조건 읽기 — 입장 탭이 있으면 사업자 탭은 무시, 잘못된 값은 버림", () => {
  assert.deepEqual(parseCustomerListQuery({ member: "pending", approval: "approved" }), { member: "pending", approval: undefined, q: "", from: undefined, to: undefined, page: 1 });
  const f = parseCustomerListQuery({ approval: "nope", member: "approved", q: " 김,유저 ", from: "2026-11-30", to: "2026-11-01", page: "3" });
  assert.equal(f.approval, undefined);
  assert.equal(f.member, undefined);
  assert.equal(f.q, "김 유저");
  assert.equal(f.from, "2026-11-01"); // 거꾸로 넣으면 바꿈
  assert.equal(f.to, "2026-11-30");
  assert.equal(f.page, 3);
  assert.equal(parseCustomerListQuery({ approval: "pending", page: "-5" }).approval, "pending");
  assert.equal(parseCustomerListQuery({ page: "-5" }).page, 1);
});

test("검색 조건 — 휴대폰·사업자번호 숫자만 넣어도 저장 모양으로 찾음", () => {
  assert.equal(customerSearchFilter(""), null);
  const p = customerSearchFilter("01012345678");
  assert.ok(p.includes("phone.ilike.%010-1234-5678%"));
  const b = customerSearchFilter("1234567890");
  assert.ok(b.includes("business_no.ilike.%123-45-67890%"));
  const n = customerSearchFilter("홍길동");
  assert.equal(n.split(",").length, 5); // 이름·휴대폰·상호·사업자번호·대표자
});

test("목록 주소 — 조건 유지, 첫 쪽은 page 생략", () => {
  const f = parseCustomerListQuery({ member: "pending", q: "kim", from: "2026-11-01" });
  assert.equal(customerListHref("/x", f, {}), "/x?member=pending&q=kim&from=2026-11-01");
  assert.equal(customerListHref("/x", f, { member: undefined, approval: "approved", page: 2 }), "/x?approval=approved&q=kim&from=2026-11-01&page=2");
  assert.equal(customerListHref("/x", parseCustomerListQuery({}), {}), "/x");
  assert.equal(customerPageCount(0), 1);
  assert.equal(customerPageCount(101), 3);
});

test("조건 붙이기 — 탭·가입일(한국 날짜)·검색", () => {
  const calls = [];
  const q = new Proxy({}, { get: (_, m) => (...a) => (calls.push([m, ...a]), q) });
  applyCustomerFilters(q, parseCustomerListQuery({ approval: "pending", from: "2026-11-15", to: "2026-11-15", q: "kim" }));
  assert.deepEqual(calls[0], ["eq", "approval_status", "pending"]);
  assert.deepEqual(calls[1], ["gte", "created_at", "2026-11-14T15:00:00.000Z"]);
  assert.deepEqual(calls[2], ["lt", "created_at", "2026-11-15T15:00:00.000Z"]);
  assert.equal(calls[3][0], "or");
});

test("엑셀 한 줄 — 칸 수가 머리글과 같고 글자로 바뀜", () => {
  const row = customerExportRow(
    { name: "유저1", phone: "010-1111-2222", approval_status: "approved", member_status: "approved", company: "가게", business_no: "123-45-67890", ceo_name: "대표", credit_limit: 500000, birth_md: "03-15", marketing_agree: true, created_at: "2026-11-15T05:05:00Z", grade: { name: "VIP" } },
    { approved: "사업자 회원" },
    { approved: "입장 승인" },
  );
  assert.equal(row.length, CUSTOMER_EXPORT_HEADERS.length);
  assert.deepEqual(row, ["유저1", "010-1111-2222", "사업자 회원", "VIP", "가게", "123-45-67890", "대표", "입장 승인", "500000", "03-15", "동의", "2026-11-15 14:05"]);
  const empty = customerExportRow({ name: "유저2", phone: "", approval_status: "none", member_status: "approved", company: null, business_no: null, ceo_name: null, credit_limit: 0, birth_md: null, marketing_agree: false, created_at: "2026-11-15T00:00:00Z", grade: null }, {}, {});
  assert.equal(empty[8], "");
  assert.equal(empty[10], "");
});
