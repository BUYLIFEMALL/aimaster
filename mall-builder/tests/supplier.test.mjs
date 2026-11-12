// D34 공급사 상태 규칙 — DB 함수(0053)와 같은 규칙인지
import { test } from "node:test";
import assert from "node:assert/strict";
import { inviteAlive, isInviteToken, nextStatuses, SUPPLIER_STATUS_LABEL } from "../src/lib/supplier.ts";

test("상태별로 고를 수 있는 다음 상태", () => {
  assert.deepEqual(nextStatuses("invited"), ["invited", "revoked"]);
  assert.deepEqual(nextStatuses("active"), ["active", "paused"]);
  assert.deepEqual(nextStatuses("paused"), ["active", "paused"]);
  assert.deepEqual(nextStatuses("revoked"), []);
});

test("초대 링크 살아 있음 판정", () => {
  const now = Date.parse("2026-11-11T00:00:00Z");
  assert.equal(inviteAlive({ status: "invited", invite_expires_at: "2026-11-12T00:00:00Z" }, now), true);
  assert.equal(inviteAlive({ status: "invited", invite_expires_at: "2026-11-10T00:00:00Z" }, now), false);
  assert.equal(inviteAlive({ status: "active", invite_expires_at: "2026-11-12T00:00:00Z" }, now), false);
  assert.equal(inviteAlive({ status: "invited", invite_expires_at: null }, now), false);
});

test("토큰 모양과 상태 글자", () => {
  assert.equal(isInviteToken("a".repeat(48)), true);
  assert.equal(isInviteToken("A".repeat(48)), false);
  assert.equal(isInviteToken("a".repeat(47)), false);
  assert.equal(SUPPLIER_STATUS_LABEL.paused, "쉬는 중");
});

test("공급사 상품 노출과 마진", async () => {
  const { supplierProductLive, marginOf } = await import("../src/lib/supplier.ts");
  assert.equal(supplierProductLive({ approval: "approved", status: "on_sale" }, "active"), true);
  assert.equal(supplierProductLive({ approval: "pending", status: "on_sale" }, "active"), false);
  assert.equal(supplierProductLive({ approval: "approved", status: "on_sale" }, "paused"), false);
  assert.equal(supplierProductLive({ approval: "approved", status: "hidden" }, "active"), false);
  assert.deepEqual(marginOf(15000, 10000), { won: 5000, rate: 33.3 });
  assert.deepEqual(marginOf(0, 0), { won: 0, rate: 0 });
});

test("월별 정산서", async () => {
  const { monthKst, monthlySummary } = await import("../src/lib/supplier.ts");
  assert.equal(monthKst("2026-10-31T15:30:00Z"), "2026-11"); // 한국 시각 11월 1일 00:30
  assert.equal(monthKst("2026-10-31T14:30:00Z"), "2026-10");
  const rows = monthlySummary([
    { kind: "earn", amount: 20000, created_at: "2026-11-02T00:00:00Z" },
    { kind: "settle", amount: -5000, created_at: "2026-11-03T00:00:00Z" },
    { kind: "reclaim", amount: -20000, created_at: "2026-11-04T00:00:00Z" },
    { kind: "earn", amount: 7000, created_at: "2026-10-10T00:00:00Z" },
  ]);
  assert.deepEqual(rows[0], { month: "2026-11", earned: 20000, reclaimed: -20000, settled: 5000, net: 0 });
  assert.deepEqual(rows[1], { month: "2026-10", earned: 7000, reclaimed: 0, settled: 0, net: 7000 });
});

test("옵션 추가 판매가 기본값(마진 비율) — DB default_extra_sale과 같음", async () => {
  const { defaultExtraSale, isSupplierShippingType } = await import("../src/lib/supplier.ts");
  assert.equal(defaultExtraSale(1000, 13000, 10000), 1300);
  assert.equal(defaultExtraSale(2000, 13000, 10000), 2600);
  assert.equal(defaultExtraSale(333, 10000, 9000), 370); // 반올림
  assert.equal(defaultExtraSale(500, 13000, 0), 500); // 공급가 0이면 같은 금액
  assert.equal(defaultExtraSale(0, 13000, 10000), 0);
  assert.ok(isSupplierShippingType("conditional"));
  assert.ok(!isSupplierShippingType("weird"));
});
