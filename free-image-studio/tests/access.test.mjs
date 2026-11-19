import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { checkProgramAccess, evaluateProgramAccess } from "../src/lib/programAccess.ts";
import { THIS_PROGRAM_SLUG, accessApiError, accessRedirect } from "../src/lib/accessDecision.ts";
import { cookieDomainForHost } from "../src/lib/supabase/cookieDomain.ts";

const base = { isAdmin: false, isSuspended: false, hasPhone: true, isFree: false, requiredGradeId: "g-normal", hasActiveSubscription: false, hasIndividualGrant: false, individualGrantExpiresAt: null, userGradeSortOrder: 1, requiredGradeSortOrder: 1 };
const run = (over) => evaluateProgramAccess({ ...base, ...over });
const future = new Date(Date.now() + 86400000).toISOString();
const past = new Date(Date.now() - 86400000).toISOString();
const MAIN = "https://www.buylife.xyz";

/** 표마다 정해 둔 한 줄을 돌려주는 가짜 DB(실제 DB·네트워크 없음) */
function fakeDb(rows) {
  const asked = [];
  return {
    asked,
    from(table) {
      asked.push(table);
      const data = rows[table] ?? null;
      const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data }), single: async () => ({ data }), then: (ok) => ok({ data }) };
      return q;
    },
  };
}

test("판정 순서: 정지 → 관리자 → 핸드폰 → FREE → 구독 → 등급+사용기간", () => {
  assert.deepEqual(run({ isSuspended: true, isAdmin: true, hasActiveSubscription: true }), { allowed: false, reason: "suspended" });
  assert.equal(run({ isAdmin: true, hasPhone: false }).allowed, true, "관리자는 핸드폰 없이도");
  assert.deepEqual(run({ hasPhone: false, isFree: true, hasActiveSubscription: true }), { allowed: false, reason: "phone_required" });
  assert.equal(run({ isFree: true, userGradeSortOrder: null }).allowed, true, "FREE는 등급 없이도");
  assert.equal(run({ hasActiveSubscription: true }).allowed, true);
  assert.equal(run({}).allowed, false, "등급만으로는 열리지 않는다");
  assert.equal(run({ hasIndividualGrant: true, individualGrantExpiresAt: null }).allowed, true);
  assert.equal(run({ hasIndividualGrant: true, individualGrantExpiresAt: future }).allowed, true);
  assert.equal(run({ hasIndividualGrant: true, individualGrantExpiresAt: past }).allowed, false);
  assert.equal(run({ hasIndividualGrant: true, userGradeSortOrder: 0 }).allowed, false);
  assert.equal(run({ hasIndividualGrant: true, userGradeSortOrder: null }).allowed, false);
});

test("프로그램이 등록되지 않았으면 관리자도 들어오지 못한다", async () => {
  const db = fakeDb({ profiles: { is_admin: true, is_suspended: false, phone: "010-1234-5678", grade: { sort_order: 9 } }, programs: null });
  const r = await checkProgramAccess(db, "u1", THIS_PROGRAM_SLUG);
  assert.deepEqual(r, { allowed: false, reason: "not_found", programId: null });
  assert.ok(!db.asked.includes("subscriptions"), "등록 전에는 구독·부여 표를 읽지 않는다");
  assert.equal(accessRedirect(r, MAIN), `${MAIN}/programs`);
  assert.deepEqual(accessApiError(r), { error: "아직 열리지 않은 프로그램입니다.", status: 403 });
});

test("등록된 뒤의 대표 경우 — 정지·핸드폰 없음·권한 없음·통과", async () => {
  const program = { id: "p1", badges: [], required_grade_id: "g1", required_grade: { sort_order: 1 } };
  const member = (over) => ({ is_admin: false, is_suspended: false, phone: "01012345678", grade: { sort_order: 1 }, ...over });
  const ask = (rows) => checkProgramAccess(fakeDb({ programs: program, ...rows }), "u1", THIS_PROGRAM_SLUG);

  const suspended = await ask({ profiles: member({ is_suspended: true, is_admin: true }) });
  assert.equal(suspended.reason, "suspended");
  assert.equal(accessRedirect(suspended, MAIN), `${MAIN}/programs/${THIS_PROGRAM_SLUG}?error=suspended`);
  assert.equal(accessApiError(suspended).status, 403);

  const noPhone = await ask({ profiles: member({ phone: "02-123-4567" }) });
  assert.equal(noPhone.reason, "phone_required", "일반 전화는 핸드폰이 아니다");
  assert.equal(accessRedirect(noPhone, MAIN), `${MAIN}/settings?need_phone=1`);

  const none = await ask({ profiles: member({}) });
  assert.equal(none.allowed, false);
  assert.equal(accessRedirect(none, MAIN), `${MAIN}/programs/${THIS_PROGRAM_SLUG}?need_access=1`);
  assert.equal(accessApiError(none).status, 403);

  const granted = await ask({ profiles: member({}), user_program_access: { expires_at: future } });
  assert.equal(granted.allowed, true);
  assert.equal(accessRedirect(granted, MAIN), null);
  assert.equal(accessApiError(granted), null);

  const noProfile = await ask({ profiles: null });
  assert.equal(noProfile.allowed, false, "회원 정보가 없으면 차단");
});

test("로그인 쿠키 도메인은 buylife.xyz 계열에서만", () => {
  assert.equal(cookieDomainForHost("free-image-studio.buylife.xyz"), ".buylife.xyz");
  assert.equal(cookieDomainForHost("buylife.xyz:443"), ".buylife.xyz");
  for (const h of ["localhost:3000", "free-image-studio.vercel.app", "evilbuylife.xyz", "buylife.xyz.evil.example", null]) assert.equal(cookieDomainForHost(h), undefined);
});

test("뼈대 계약 — 작업 화면 레이아웃은 권한 판정·캐시 금지·검색 제외를 갖는다", async () => {
  const layout = await readFile(new URL("../src/app/(dashboard)/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /await requireProgramAccess\(\)/);
  assert.match(layout, /export const dynamic = "force-dynamic"/);
  assert.match(layout, /export const fetchCache = "force-no-store"/);
  assert.match(layout, /index: false/);
  const access = await readFile(new URL("../src/lib/access.ts", import.meta.url), "utf8");
  assert.match(access, /createAdminClient\(\)/, "권한 표는 서비스 키 클라이언트로 읽는다");
  assert.ok(!/OPENAI|ANTHROPIC|GEMINI/i.test(access), "운영자 AI 키를 읽지 않는다");
});

test("결정 전 항목이 코드에 들어가지 않았다 — AI 모델 이름·지원 사양 문구·요금", async () => {
  const { readdir } = await import("node:fs/promises");
  const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((e) => (e.isDirectory() ? walk(new URL(`${e.name}/`, dir)) : [new URL(e.name, dir)])))).flat();
  for (const file of await walk(new URL("../src/", import.meta.url))) {
    const text = await readFile(file, "utf8");
    // 「무료 배지」라는 말 자체는 공용 판정 사본의 규칙 설명에 있어 검사하지 않는다(배지를 켜는 것은 DB에서 주인님이 한다).
    assert.ok(!/gpt-|claude-|gemini-|\b(8|10|12|16)\s?GB\b|월 \d|원\/월|badges:\s*\[/.test(text), `${file.pathname}에 결정 전 값이 있다`);
  }
});
