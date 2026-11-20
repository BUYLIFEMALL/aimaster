// R1 이 앱 연결점 후보의 모의 시험 (2026-11-20, CC-SNS-01). 실제 DB·네트워크를 쓰지 않는다 — 서비스 클라이언트는 가짜다.
// 실행(저장소 뿌리에서): node --test docs/analysis-ai-influencer-20261118/candidates/r1/app-hook/policy.test.mjs
// ★ 실행 이력·결과는 여기 적지 않는다 — W00_BASELINE.md에 적는다.
// 한계: 가짜 클라이언트는 이 후보가 부르는 모양(from·select·eq·maybeSingle·limit·rpc)만 흉내 낸다. PostgREST의 실제 응답 모양
//       (setof uuid가 글자 배열로 오는지 등)은 운영 적용 뒤 실제 호출로만 확인된다.
import test from "node:test";
import assert from "node:assert/strict";
import { createPlatformSchedulerPolicy, POLICY_LIST_LIMIT } from "./platformSchedulerPolicy.candidate.ts";

const A = "00000000-0000-4000-8000-0000000000a1", M1 = "00000000-0000-4000-8000-0000000000b1", M2 = "00000000-0000-4000-8000-0000000000b2";

/** 가짜 서비스 클라이언트. state = { admins:Set, allowed:Set, fail:{profile,isAllowed,list,admins}, shape:{…}, calls:[] } */
function fake(state) {
  const calls = (state.calls = []);
  const err = (m) => ({ data: null, error: { message: m } });
  return {
    from(table) {
      assert.equal(table, "profiles");
      const q = { cols: null, filters: [] };
      const b = {
        select(cols) { q.cols = cols; return b; },
        eq(col, val) { q.filters.push([col, val]); return b; },
        async maybeSingle() {
          calls.push(["profiles.one", q.cols, ...q.filters.flat()]);
          if (state.fail?.profile) return err("profile down");
          const id = q.filters.find(([c]) => c === "id")?.[1];
          if (state.noProfile?.has(id)) return { data: null, error: null };
          return { data: { is_admin: state.admins.has(id) }, error: null };
        },
        async limit(n) {
          calls.push(["profiles.admins", q.cols, ...q.filters.flat(), n]);
          if (state.fail?.admins) return err("admins down");
          if (state.shape?.admins !== undefined) return { data: state.shape.admins, error: null };
          return { data: [...state.admins].map((id) => ({ id })), error: null };
        },
      };
      return b;
    },
    async rpc(name, args) {
      calls.push(["rpc", name, args ?? null]);
      if (name === "aif_platform_scheduler_is_allowed") {
        if (state.fail?.isAllowed) return err("rpc down");
        if (state.shape?.isAllowed !== undefined) return { data: state.shape.isAllowed, error: null };
        return { data: state.allowed.has(args.p_user), error: null };
      }
      if (name === "aif_platform_scheduler_allowed_users") {
        if (state.fail?.list) return err("list down");
        if (state.shape?.list !== undefined) return { data: state.shape.list, error: null };
        return { data: [...state.allowed], error: null };
      }
      throw new Error("모르는 함수: " + name);
    },
  };
}
const base = (over = {}) => ({ admins: new Set([A]), allowed: new Set([M1]), ...over });
const P = createPlatformSchedulerPolicy();

test("모양: 기본값은 cron-job.org, 칸 이름 두 개, 함수 두 개", () => {
  assert.equal(P.defaultMode, "cronjob");
  assert.equal(P.choiceColumn, "platform_chosen_at"); assert.equal(P.revisionColumn, "mode_rev");
  assert.equal(typeof P.allowed, "function"); assert.equal(typeof P.listAllowedUserIds, "function");
});

test("allowed: 허용된 회원은 참, 허용되지 않은 회원은 거짓", async () => {
  const s = base();
  assert.equal(await P.allowed(fake(s), M1), true);
  assert.equal(await P.allowed(fake(s), M2), false);
});

test("allowed: 관리자는 허용 저장소를 묻지 않고 참", async () => {
  const s = base();
  assert.equal(await P.allowed(fake(s), A), true);
  assert.equal(s.calls.some((c) => c[0] === "rpc"), false, "관리자는 허용 함수를 부르지 않는다");
});

test("allowed: 프로필 행이 없는 회원은 관리자가 아니다 — 허용 저장소의 답을 따른다", async () => {
  assert.equal(await P.allowed(fake(base({ noProfile: new Set([M2]) })), M2), false);
  assert.equal(await P.allowed(fake(base({ noProfile: new Set([M1]) })), M1), true);
});

test("allowed: 회원 번호가 비면 아무것도 부르지 않고 거짓", async () => {
  const s = base();
  assert.equal(await P.allowed(fake(s), ""), false);
  assert.equal(s.calls.length, 0);
});

test("allowed: 조회가 실패하면 던진다(거짓으로 답하지 않는다)", async () => {
  await assert.rejects(P.allowed(fake(base({ fail: { profile: true } })), M1), /관리자 확인/);
  await assert.rejects(P.allowed(fake(base({ fail: { isAllowed: true } })), M1), /허용 조회/);
});

test("allowed: 허용 함수의 답이 참·거짓이 아니면 던진다(빈 값·글자를 허용으로 읽지 않는다)", async () => {
  for (const v of [null, "true", 1, [true]]) await assert.rejects(P.allowed(fake(base({ shape: { isAllowed: v } })), M1), /응답 모양/, String(v));
});

test("allowed: 넘기는 값 — 프로필은 그 회원 번호로, 허용 함수는 p_user로", async () => {
  const s = base();
  await P.allowed(fake(s), M2);
  assert.deepEqual(s.calls, [["profiles.one", "is_admin", "id", M2], ["rpc", "aif_platform_scheduler_is_allowed", { p_user: M2 }]]);
});

test("목록: 허용 회원 + 관리자, 겹치면 한 번만", async () => {
  const s = base({ allowed: new Set([M1, A]) });
  const ids = await P.listAllowedUserIds(fake(s));
  assert.deepEqual([...ids].sort(), [A, M1].sort());
});

test("목록: 허용 회원이 없어도 관리자는 들어간다 / 둘 다 없으면 빈 목록", async () => {
  assert.deepEqual(await P.listAllowedUserIds(fake(base({ allowed: new Set() }))), [A]);
  assert.deepEqual(await P.listAllowedUserIds(fake(base({ allowed: new Set(), admins: new Set() }))), []);
});

test("목록: 어느 한쪽 조회라도 실패하면 던진다(일부만 돌려주지 않는다)", async () => {
  await assert.rejects(P.listAllowedUserIds(fake(base({ fail: { list: true } }))), /허용 목록/);
  await assert.rejects(P.listAllowedUserIds(fake(base({ fail: { admins: true } }))), /관리자 목록/);
});

test("목록: 응답이 배열이 아니거나 회원 번호가 아닌 값이 섞이면 던진다", async () => {
  await assert.rejects(P.listAllowedUserIds(fake(base({ shape: { list: null } }))), /응답 모양/);
  await assert.rejects(P.listAllowedUserIds(fake(base({ shape: { admins: {} } }))), /응답 모양/);
  await assert.rejects(P.listAllowedUserIds(fake(base({ shape: { list: [M1, { aif_platform_scheduler_allowed_users: M2 }] } }))), /목록 값/);
  await assert.rejects(P.listAllowedUserIds(fake(base({ shape: { admins: [{ id: null }] } }))), /목록 값/);
});

test("목록: 상한에 닿으면 잘렸을 수 있으므로 던진다(상한 바로 아래는 통과)", async () => {
  const many = (n) => Array.from({ length: n }, (_, i) => "00000000-0000-4000-8000-" + String(i).padStart(12, "0"));
  await assert.rejects(P.listAllowedUserIds(fake(base({ shape: { list: many(POLICY_LIST_LIMIT) } }))), /목록 상한/);
  await assert.rejects(P.listAllowedUserIds(fake(base({ shape: { admins: many(POLICY_LIST_LIMIT).map((id) => ({ id })) } }))), /목록 상한/);
  assert.equal((await P.listAllowedUserIds(fake(base({ admins: new Set(), shape: { list: many(POLICY_LIST_LIMIT - 1) } })))).length, POLICY_LIST_LIMIT - 1);
});

test("목록: 넘기는 값 — 허용 함수는 인자 없이, 관리자 목록은 is_admin = true와 상한", async () => {
  const s = base();
  await P.listAllowedUserIds(fake(s));
  assert.deepEqual(s.calls, [["rpc", "aif_platform_scheduler_allowed_users", null], ["profiles.admins", "id", "is_admin", true, POLICY_LIST_LIMIT]]);
});
