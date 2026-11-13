import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateAccess } from "../src/lib/accessVerdict.ts";

// 가짜 DB — 실제 회원·DB 읽기/쓰기 없음. 맥미니 P3(이용기간 없는 회원 차단)을 실물 계정 없이 확인한다.
const DAY = 86_400_000;
function fakeDb({ me = {}, program = {}, subs = [], grant = null, required = { sort_order: 1 } } = {}) {
  const rows = {
    profiles: { is_suspended: false, is_admin: false, phone: "010-1234-5678", grade: { sort_order: 1 }, ...me },
    programs: { id: "p1", required_grade_id: "g1", badges: [], ...program },
    member_grades: required,
    user_program_access: grant,
  };
  return {
    from(table) {
      const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: rows[table] ?? null }) };
      if (table === "subscriptions") q.eq = () => Object.assign(Promise.resolve({ data: subs }), { eq: () => Promise.resolve({ data: subs }) });
      return q;
    },
  };
}
const future = new Date(Date.now() + 30 * DAY).toISOString();
const past = new Date(Date.now() - DAY).toISOString();

test("AC01 이용기간이 없는 일반 회원은 막힌다(P3)", async () => {
  assert.deepEqual(await evaluateAccess("u", fakeDb()), { ok: false, reason: "denied" });
});
test("AC02 이용기간이 끝난 회원도 막힌다", async () => {
  assert.deepEqual(await evaluateAccess("u", fakeDb({ grant: { expires_at: past } })), { ok: false, reason: "denied" });
});
test("AC03 이용기간이 남은 일반 이상 회원은 열린다(무기한 포함)", async () => {
  assert.equal((await evaluateAccess("u", fakeDb({ grant: { expires_at: future } }))).ok, true);
  assert.equal((await evaluateAccess("u", fakeDb({ grant: { expires_at: null } }))).ok, true);
});
test("AC04 등급이 모자라면 이용기간이 있어도 막힌다", async () => {
  assert.equal((await evaluateAccess("u", fakeDb({ me: { grade: { sort_order: 0 } }, grant: { expires_at: future } }))).ok, false);
});
test("AC05 FREE 배지·유효 구독은 이용기간 없이 열리고, 만료 구독은 아니다", async () => {
  assert.equal((await evaluateAccess("u", fakeDb({ program: { badges: ["free"] } }))).ok, true);
  assert.equal((await evaluateAccess("u", fakeDb({ subs: [{ status: "active", expires_at: future }] }))).ok, true);
  assert.equal((await evaluateAccess("u", fakeDb({ subs: [{ status: "active", expires_at: past }] }))).ok, false);
});
test("AC06 정지·핸드폰 없음은 먼저 막고, 관리자는 항상 열린다", async () => {
  assert.deepEqual(await evaluateAccess("u", fakeDb({ me: { is_suspended: true, is_admin: true } })), { ok: false, reason: "suspended" });
  assert.deepEqual(await evaluateAccess("u", fakeDb({ me: { phone: "02-123-4567" }, program: { badges: ["free"] } })), { ok: false, reason: "phone" });
  assert.equal((await evaluateAccess("u", fakeDb({ me: { is_admin: true, phone: null } }))).ok, true);
});
