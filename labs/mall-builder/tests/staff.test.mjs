import { test } from "node:test";
import assert from "node:assert/strict";
import { canSeeMenu, cleanPerms, permsLabel, MENU_PERM } from "../src/lib/staff.ts";

test("권한 정리 — 6개 묶음만, 참만 켬", () => {
  assert.deepEqual(cleanPerms({ orders: true, hack: true, stats: "true" }), { orders: true, products: false, customers: false, boards: false, home: false, stats: false });
  assert.deepEqual(cleanPerms(null).orders, false);
});

test("메뉴 보기 — 대표는 전부, 직원은 켠 묶음·대시보드만, 설정·직원 관리는 대표만", () => {
  const owner = { role: "owner", perms: {} };
  const staff = { role: "staff", perms: { orders: true } };
  assert.equal(canSeeMenu("/settings", owner), true);
  assert.equal(canSeeMenu("", staff), true);
  assert.equal(canSeeMenu("/orders", staff), true);
  assert.equal(canSeeMenu("/quotes", staff), true);
  assert.equal(canSeeMenu("/products", staff), false);
  assert.equal(canSeeMenu("/settings", staff), false);
  assert.equal(canSeeMenu("/staff", staff), false);
  assert.equal(canSeeMenu("/unknown", staff), false);
  assert.equal(canSeeMenu("/orders", null), false);
});

test("관리 메뉴 전부에 권한이 정해져 있다", () => {
  for (const href of ["", "/orders", "/quotes", "/customers", "/coupons", "/stats", "/settings", "/home", "/notices", "/reviews", "/inquiries", "/faq", "/categories", "/products", "/group-buys", "/restock", "/shipping", "/photos", "/staff"]) {
    assert.ok(MENU_PERM[href], href);
  }
  assert.equal(permsLabel({ orders: true, stats: true }), "주문·견적, 통계");
  assert.equal(permsLabel({}), "권한 없음");
});
