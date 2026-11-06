import test from "node:test";
import assert from "node:assert/strict";
import { checkProgramAccess, evaluateProgramAccess } from "../src/lib/programAccess.ts";

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

// 가짜 DB — 표마다 정해진 답을 주고, 조회가 「동시에」 몇 묶음으로 나가는지 센다(2026-11-06 두 묶음 동시 조회)
function fakeDb(answers, log) {
  let inFlight = 0;
  let peak = 0;
  const query = (table) => {
    const finish = () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      log.push(table);
      return new Promise((resolve) => setTimeout(() => (inFlight--, resolve({ data: answers[table] ?? null, error: null })), 5));
    };
    const q = {
      select: () => q,
      eq: () => q,
      maybeSingle: finish,
      single: finish,
      then: (ok, bad) => finish().then(ok, bad),
    };
    return q;
  };
  return { from: query, peak: () => peak };
}

test("checkProgramAccess: 프로필+프로그램, 구독+부여를 두 묶음으로 동시에 조회하고 판정은 같다", async () => {
  const log = [];
  const db = fakeDb(
    {
      profiles: { is_admin: false, is_suspended: false, phone: "010-1234-5678", grade: { sort_order: 1 } },
      programs: { id: "p1", badges: [], required_grade_id: "g-normal", required_grade: { sort_order: 1 } },
      subscriptions: [],
      user_program_access: { expires_at: future },
    },
    log
  );
  const r = await checkProgramAccess(db, "u1", "free-music-studio");
  assert.deepEqual(r, { allowed: true, reason: "individual_grant", programId: "p1" });
  assert.deepEqual(log.slice(0, 2).sort(), ["profiles", "programs"]);
  assert.deepEqual(log.slice(2).sort(), ["subscriptions", "user_program_access"]);
  assert.equal(db.peak(), 2);
});

test("checkProgramAccess: 프로그램이 없으면 구독·부여를 조회하지 않고 not_found", async () => {
  const log = [];
  const db = fakeDb({ profiles: { is_admin: true }, programs: null }, log);
  assert.deepEqual(await checkProgramAccess(db, "u1", "없음"), { allowed: false, reason: "not_found", programId: null });
  assert.deepEqual(log.sort(), ["profiles", "programs"]);
});
