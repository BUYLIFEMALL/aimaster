import test from "node:test";
import assert from "node:assert/strict";
import { evaluateProgramAccess } from "../src/lib/programAccess.ts";

const base = {
  isAdmin: false,
  isSuspended: false,
  isFree: false,
  requiredGradeId: "g-normal",
  hasActiveSubscription: false,
  hasIndividualGrant: false,
  individualGrantExpiresAt: null,
  userGradeSortOrder: 1,
  requiredGradeSortOrder: 1,
};
const run = (over) => evaluateProgramAccess({ ...base, ...over });
const future = new Date(Date.now() + 86400000).toISOString();
const past = new Date(Date.now() - 86400000).toISOString();

test("정지 계정은 관리자·구독이어도 차단", () => {
  assert.equal(run({ isSuspended: true, isAdmin: true, hasActiveSubscription: true }).allowed, false);
});

test("관리자는 항상 허용", () => {
  assert.equal(run({ isAdmin: true }).allowed, true);
});

test("FREE 배지는 등급·사용기간 없이도 가입 회원 허용", () => {
  assert.equal(run({ isFree: true, userGradeSortOrder: null }).allowed, true);
});

test("결제한 구독이 있으면 허용", () => {
  assert.equal(run({ hasActiveSubscription: true }).allowed, true);
});

test("등급만으로는 열리지 않는다(사용기간 부여 필요)", () => {
  assert.equal(run({}).allowed, false);
});

test("등급 ≥ 최소 등급 + 부여된 사용기간(무기한 또는 남음)이면 허용", () => {
  assert.equal(run({ hasIndividualGrant: true, individualGrantExpiresAt: null }).allowed, true);
  assert.equal(run({ hasIndividualGrant: true, individualGrantExpiresAt: future }).allowed, true);
});

test("사용기간 만료·등급 부족·등급 없음은 차단", () => {
  assert.equal(run({ hasIndividualGrant: true, individualGrantExpiresAt: past }).allowed, false);
  assert.equal(run({ hasIndividualGrant: true, userGradeSortOrder: 0, requiredGradeSortOrder: 1 }).allowed, false);
  assert.equal(run({ hasIndividualGrant: true, userGradeSortOrder: null }).allowed, false);
});

test("최소 등급이 지정되지 않은 프로그램은 로그인 회원 허용", () => {
  assert.equal(run({ requiredGradeId: null }).allowed, true);
});
