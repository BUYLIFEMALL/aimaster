// T2 분양몰 규칙 — DB 0061과 같은 규칙인지
import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidSlug, resaleAccepting, resaleDaysLeft, resaleOpen, RESALE_STATUS_LABEL } from "../src/lib/resale.ts";

test("몰 주소 규칙", () => {
  assert.ok(isValidSlug("my-shop"));
  assert.ok(isValidSlug("abc"));
  assert.ok(!isValidSlug("ab"));
  assert.ok(!isValidSlug("My-shop"));
  assert.ok(!isValidSlug("my--shop"));
  assert.ok(!isValidSlug("shop-"));
  assert.ok(!isValidSlug("-shop"));
});

test("이용 기간 남은 날", () => {
  const now = new Date("2026-11-13T00:00:00Z");
  assert.equal(resaleDaysLeft(null, now), null);
  assert.equal(resaleDaysLeft("2026-11-12T00:00:00Z", now), 0);
  assert.equal(resaleDaysLeft("2026-11-27T00:00:00Z", now), 14);
  assert.equal(resaleDaysLeft("2026-11-13T01:00:00Z", now), 1);
});

test("분양몰 주문 가능 여부와 분양 받기", () => {
  const now = new Date("2026-11-13T00:00:00Z");
  assert.ok(resaleOpen({ kind: "standard", resale_expires_at: null }, now));
  assert.ok(resaleOpen({ kind: "resale", resale_expires_at: "2026-11-20T00:00:00Z" }, now));
  assert.ok(!resaleOpen({ kind: "resale", resale_expires_at: "2026-11-12T00:00:00Z" }, now));
  assert.ok(!resaleOpen({ kind: "resale", resale_expires_at: null }, now));
  assert.ok(resaleAccepting({ bank_transfer: true, resale: true }));
  assert.ok(!resaleAccepting({ bank_transfer: true }));
  assert.ok(!resaleAccepting(null));
  assert.equal(RESALE_STATUS_LABEL.pending, "승인 대기");
});
