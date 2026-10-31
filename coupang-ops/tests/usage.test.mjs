// 쿠팡 호출 수 규칙·승인 요청·브랜드 검색 정리(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { budgetMessage, kstDayStartIso, kstMonth, kstMonthStartIso, positiveInt, reachedWarning, warningTitle } from "../src/lib/coupang/usageRule.ts";
import { APPROVABLE_STATUS, approvalPath } from "../src/lib/coupang/status.ts";
import { brandWarnings } from "../src/lib/coupang/brand.ts";

const counts = (today, month) => ({ today, month, dailyLimit: 100, monthlyLimit: 500 });

test("상한 아래면 막지 않고, 일일·월 상한에서 막는다", () => {
  assert.equal(budgetMessage(counts(99, 474)), "");
  assert.match(budgetMessage(counts(100, 10)), /오늘 쓸 수 있는/);
  assert.match(budgetMessage(counts(0, 475)), /이번 달/);
  assert.match(budgetMessage(counts(100, 475)), /주문·송장 처리는 계속/);
});

test("70%에서 경고한다", () => {
  assert.equal(reachedWarning(349, 500), false);
  assert.equal(reachedWarning(350, 500), true);
});

test("한국 날짜 기준으로 나눈다", () => {
  const justAfterMidnightKst = Date.parse("2026-10-31T15:30:00Z"); // 11월 1일 00:30
  assert.equal(kstMonth(justAfterMidnightKst), "2026-11");
  assert.equal(kstDayStartIso(justAfterMidnightKst), "2026-10-31T15:00:00.000Z");
  assert.equal(kstMonthStartIso(justAfterMidnightKst), "2026-10-31T15:00:00.000Z");
  assert.match(warningTitle(justAfterMidnightKst), /2026-11/);
});

test("환경변수 값이 이상하면 기본값", () => {
  assert.equal(positiveInt("2500", 500), 2500);
  assert.equal(positiveInt(undefined, 500), 500);
  assert.equal(positiveInt("0", 500), 500);
  assert.equal(positiveInt("abc", 500), 500);
});

test("승인 요청 경로와 가능한 상태", () => {
  assert.equal(approvalPath(123), "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/123/approvals");
  assert.ok(APPROVABLE_STATUS.includes("임시저장"));
  assert.ok(APPROVABLE_STATUS.includes("승인반려"));
  assert.ok(!APPROVABLE_STATUS.includes("승인완료"));
});

test("브랜드 검색 결과로 경고를 만든다", () => {
  const body = (items) => ({ code: "SUCCESS", data: { items } });
  assert.deepEqual(brandWarnings(body([{ brandName: "NIKE", isUIDRequired: false }]), "nike"), []);
  assert.match(brandWarnings(body([{ brandName: "NIKE", isUIDRequired: true }]), "NIKE")[0], /UID/);
  assert.match(brandWarnings(body([{ brandName: "NIKEA" }]), "NIKE")[0], /찾지 못했습니다/);
  assert.match(brandWarnings(body([]), "없는브랜드")[0], /GENERIC/);
  assert.equal(brandWarnings(null, "NIKE").length, 1);
});
