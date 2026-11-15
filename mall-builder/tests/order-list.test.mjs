// 실행: node --test tests/   — M2-1 운영사 주문 목록 조건(2026-11-15)
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanDate, cleanSearch, kstDayStart, kstNextDayStart, orderListHref, orderSearchFilter, pageCount, parseOrderListQuery } from "../src/lib/order-list.ts";

const TABS = ["pending_payment", "paid", "shipping"];

test("조건 읽기: 모르는 상태는 버리고, 페이지는 1~1000, 송장 없음은 1일 때만", () => {
  const f = parseOrderListQuery({ status: "hacked", page: "-3", no_tracking: "yes", q: "  홍길동 " }, TABS);
  assert.equal(f.status, undefined);
  assert.equal(f.page, 1);
  assert.equal(f.noTracking, false);
  assert.equal(f.q, "홍길동");
  const g = parseOrderListQuery({ status: "paid", page: ["5", "9"], no_tracking: "1" }, TABS);
  assert.deepEqual([g.status, g.page, g.noTracking], ["paid", 5, true]);
  assert.equal(parseOrderListQuery({ page: "99999" }, TABS).page, 1000);
});

test("날짜: 없는 날짜·모양 틀림은 버리고, 거꾸로 넣으면 바꿔 준다", () => {
  assert.equal(cleanDate("2026-02-30"), undefined);
  assert.equal(cleanDate("2026/11/15"), undefined);
  assert.equal(cleanDate("2026-11-15"), "2026-11-15");
  const f = parseOrderListQuery({ from: "2026-11-20", to: "2026-11-01" }, TABS);
  assert.deepEqual([f.from, f.to], ["2026-11-01", "2026-11-20"]);
});

test("한국 날짜 하루 = UTC 전날 15시부터 다음 날 15시 전까지", () => {
  assert.equal(kstDayStart("2026-11-15"), "2026-11-14T15:00:00.000Z");
  assert.equal(kstNextDayStart("2026-11-15"), "2026-11-15T15:00:00.000Z");
  assert.equal(kstNextDayStart("2026-12-31"), "2026-12-31T15:00:00.000Z");
});

test("검색어 정리: 조건 문자열을 깨는 글자 제거·40자", () => {
  assert.equal(cleanSearch("a,b(c)'d\"e%f*g" + String.fromCharCode(92) + "h"), "a b c d e f g h");
  assert.equal(cleanSearch("가".repeat(50)).length, 40);
});

test("검색 조건: 6칸, 휴대폰 숫자만 넣으면 하이픈 모양도", () => {
  assert.equal(orderSearchFilter(""), null);
  const s = orderSearchFilter("홍길동");
  assert.equal(s.split(",").length, 6);
  assert.ok(s.includes("receiver->>receiver.ilike.%홍길동%"));
  const p = orderSearchFilter("01012345678");
  assert.ok(p.includes("guest_phone.ilike.%010-1234-5678%"));
  assert.equal(p.split(",").length, 12);
  assert.equal(orderSearchFilter("0101234567").includes("010-123-4567"), true);
  assert.equal(orderSearchFilter("20261115-0001").split(",").length, 6); // 주문번호는 휴대폰으로 보지 않음
});

test("목록 주소: 조건 유지, 기본값은 생략", () => {
  const f = parseOrderListQuery({ status: "paid", q: "홍", from: "2026-11-01", no_tracking: "1", page: "2" }, TABS);
  assert.equal(orderListHref("/s/m/admin/orders", f, { page: 3 }), "/s/m/admin/orders?status=paid&q=%ED%99%8D&from=2026-11-01&no_tracking=1&page=3");
  assert.equal(orderListHref("/s/m/admin/orders", parseOrderListQuery({}, TABS), {}), "/s/m/admin/orders");
  assert.equal(orderListHref("/b", f, { status: undefined, page: 1 }), "/b?q=%ED%99%8D&from=2026-11-01&no_tracking=1");
});

test("쪽 수: 0건도 1쪽, 50건 단위", () => {
  assert.deepEqual([pageCount(0), pageCount(50), pageCount(51), pageCount(201)], [1, 1, 2, 5]);
});
