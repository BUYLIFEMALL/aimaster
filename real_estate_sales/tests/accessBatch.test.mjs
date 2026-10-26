// RE-P2: 예약 수집 대상 판정 — 화면 접속(requireProgramAccess)과 같은 순서
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateAccess, programAccessUserIds } from "../src/lib/accessBatch.ts";

const now = new Date("2026-10-26T00:00:00Z");
const base = { isAdmin: false, free: false, requiredGradeOrder: 1, gradeOrder: 1, subs: [], grantExpiresAt: "2026-12-31T00:00:00Z" };

test("등급 + 사용기간이 남아 있으면 허용, 만료되면 차단", () => {
  assert.equal(evaluateAccess(base, now), true);
  assert.equal(evaluateAccess({ ...base, grantExpiresAt: "2026-10-01T00:00:00Z" }, now), false);
  assert.equal(evaluateAccess({ ...base, grantExpiresAt: null }, now), true); // 무기한
  assert.equal(evaluateAccess({ ...base, grantExpiresAt: undefined }, now), false); // 부여 없음 — 등급만으로는 안 열림
});

test("등급 부족이면 차단, 관리자·FREE·유효 구독은 허용", () => {
  assert.equal(evaluateAccess({ ...base, gradeOrder: 0 }, now), false);
  assert.equal(evaluateAccess({ ...base, gradeOrder: null, grantExpiresAt: undefined, isAdmin: true }, now), true);
  assert.equal(evaluateAccess({ ...base, gradeOrder: null, grantExpiresAt: undefined, free: true }, now), true);
  assert.equal(evaluateAccess({ ...base, grantExpiresAt: undefined, subs: [{ status: "active", expires_at: "2026-11-30T00:00:00Z" }] }, now), true);
  assert.equal(evaluateAccess({ ...base, grantExpiresAt: undefined, subs: [{ status: "active", expires_at: "2026-10-01T00:00:00Z" }] }, now), false);
  assert.equal(evaluateAccess({ ...base, requiredGradeOrder: null, grantExpiresAt: undefined, gradeOrder: null }, now), true); // 최소 등급 없음
});

test("여러 회원 한 번에: 가짜 DB로 권한 있는 회원만", async () => {
  const rows = {
    programs: [{ id: "p1", required_grade_id: "g1", badges: [] }],
    profiles: [{ id: "a", is_admin: false, grade_id: "g1" }, { id: "b", is_admin: false, grade_id: "g1" }, { id: "c", is_admin: true, grade_id: null }],
    subscriptions: [],
    user_program_access: [{ user_id: "a", expires_at: "2026-12-31T00:00:00Z" }, { user_id: "b", expires_at: "2026-10-01T00:00:00Z" }],
    member_grades: [{ id: "g1", sort_order: 1 }],
  };
  const q = (t) => {
    const p = { data: rows[t] };
    const chain = { select: () => chain, eq: () => chain, in: () => chain, maybeSingle: async () => ({ data: rows[t][0] }), then: (r) => r(p) };
    return chain;
  };
  const ok = await programAccessUserIds({ from: q }, "real-estate-sales", ["a", "b", "c"], now);
  assert.deepEqual([...ok].sort(), ["a", "c"]);
});
