// 실행: node --test tests/   — M2-3 운영사 대시보드 「처리할 일」(2026-11-15)
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTodoGroups, kstDaysAgo, orderTodoQueries } from "../src/lib/admin-todo.ts";

const NOW = new Date("2026-11-15T16:30:00Z"); // 한국 11-16 01:30
const all = () => true;

test("한국 날짜 n일 전: UTC 날짜가 아니라 한국 날짜 기준", () => {
  assert.equal(kstDaysAgo(NOW, 0), "2026-11-16");
  assert.equal(kstDaysAgo(NOW, 3), "2026-11-13");
});

test("지연 항목 = 송장 없음 + 그 날짜까지(목록 조건과 같음)", () => {
  const q = Object.fromEntries(orderTodoQueries(NOW).map((o) => [o.key, o.query]));
  assert.deepEqual([q.late3.noTracking, q.late3.to, q.late7.to], [true, "2026-11-13", "2026-11-09"]);
  assert.equal(q.paid.status, "paid");
});

test("묶음: 주문 링크는 목록 조건 주소, 0건 대기 항목은 숨김", () => {
  const g = buildTodoGroups({ orders: { late3: 2 }, waiting: { inquiries: 1, quotes: 0 }, products: { on_sale: 5 } }, "/s/m/admin", NOW, all);
  assert.deepEqual(g.map((x) => x.title), ["주문 처리", "답변·승인 대기", "상품 현황"]);
  const late3 = g[0].items.find((i) => i.key === "late3");
  assert.equal(late3.href, "/s/m/admin/orders?to=2026-11-13&no_tracking=1");
  assert.equal(late3.count, 2);
  assert.deepEqual(g[1].items.map((i) => [i.key, i.href]), [["inquiries", "/s/m/admin/inquiries"]]);
  assert.equal(g[0].items.find((i) => i.key === "paid").count, 0);
});

test("권한: 볼 수 없는 메뉴는 묶음·항목째 빠짐, 대기가 전부 0이면 묶음 숨김", () => {
  const onlyInquiries = (m) => m === "/inquiries";
  const g = buildTodoGroups({ orders: { paid: 3 }, waiting: { inquiries: 2, biz: 4 }, products: {} }, "/b", NOW, onlyInquiries);
  assert.deepEqual(g.map((x) => x.title), ["답변·승인 대기"]);
  assert.deepEqual(g[0].items.map((i) => i.key), ["inquiries"]);
  assert.deepEqual(buildTodoGroups({ orders: {}, waiting: {}, products: {} }, "/b", NOW, (m) => m === "/reviews"), []);
});
