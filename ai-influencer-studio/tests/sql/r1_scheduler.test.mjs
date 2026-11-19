// R1 DB 후보(두 칸 + 허용 표)의 적용·권한·원복 격리 시험 (2026-11-19, CC-SNS-01, Master msg_d5a93c1e9c7d).
// ★ 실행 이력·결과는 이 파일에 적지 않는다 — ai-influencer-studio/docs/PLAN_20261119_R1_SCHEDULER_DEFAULT.md §13에 적는다.
// 실행: node --test tests/sql/r1_scheduler.test.mjs   (npm test에는 포함되지 않는다)
// 격리: 로컬 Docker 컨테이너 aww-pg-test에 새 DB qa_aif_r1_20261119만 만들고(이미 있으면 중단) 끝나면 그 DB만(oid 일치 확인) 지운다.
//       운영·공유 DB 접속 0. 후보는 tests/sql/candidates/에 있고 이 시험 DB에서만 실행한다.
// ★ 한계
//   * 실행 방식 표의 정의는 프로젝트 마이그레이션 파일에서 글자 그대로 잘라 왔다. auth.users·profiles는 이 시험이 쓰는 칸만 가진 대역이다.
//   * 호출은 PostgREST를 거치지 않는다(역할 바꾸기 + 요청 회원 번호 설정으로 옮겼다). 운영 표의 소유자·기본 권한·다른 정책은 여기 없다.
//   * 「기존 앱 호환」은 공용 코드가 보내는 것과 같은 모양의 SQL(칸 이름을 적은 조회, 새 칸 없는 넣기·고치기)로만 본다. 실제 앱을 돌리지 않는다.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { requireLocalFixtureTarget } from "./_fixtureGuard.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DB = "qa_aif_r1_20261119";
const lf = (t) => t.replace(/\r\n/g, "\n");
const CANDIDATE = lf(readFileSync(join(HERE, "candidates", "aif_r1_scheduler_candidate.sql"), "utf8"));
const ROLLBACK = lf(readFileSync(join(HERE, "candidates", "aif_r1_scheduler_rollback.sql"), "utf8"));

// 실행 방식 표의 실제 정의 — 프로젝트 마이그레이션에서 글자 그대로(표 만들기 ~ 읽기 정책). 못 찾으면 시험을 시작하지 않는다.
const MIG = lf(readFileSync(join(HERE, "..", "..", "supabase", "migrations", "20261020120000_insta_schedule_v1_15.sql"), "utf8"));
const START = "create table if not exists public.aif_member_scheduler (";
const END = "create policy aif_member_scheduler_select_own on public.aif_member_scheduler for select to authenticated using (auth.uid() = user_id);";
const si = MIG.indexOf(START), ei = MIG.indexOf(END);
if (si < 0 || ei < si || MIG.indexOf(START, si + 1) >= 0) throw new Error("마이그레이션에서 aif_member_scheduler 정의를 하나로 찾지 못했습니다 — 시험을 시작하지 않습니다.");
const SCHEDULER_TABLE = MIG.slice(si, ei + END.length);

const FIXTURE = `
create schema if not exists auth;
grant usage on schema public, auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated, service_role;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, is_admin boolean not null default false);
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
grant select on public.profiles to service_role;
${SCHEDULER_TABLE}
grant all on public.aif_member_scheduler to anon, authenticated, service_role;`;

const U = { admin: "00000000-0000-4000-8000-0000000000a1", admin2: "00000000-0000-4000-8000-0000000000a2", m1: "00000000-0000-4000-8000-0000000000b1", m2: "00000000-0000-4000-8000-0000000000b2", m3: "00000000-0000-4000-8000-0000000000b3" };
const SEED = `
insert into auth.users (id) values ('${U.admin}'), ('${U.admin2}'), ('${U.m1}'), ('${U.m2}'), ('${U.m3}');
insert into public.profiles (id, is_admin) values ('${U.admin}', true), ('${U.admin2}', true), ('${U.m1}', false), ('${U.m2}', false), ('${U.m3}', false);
insert into public.aif_member_scheduler (user_id, mode, token_hash) values ('${U.m1}', 'vercel', 'unset-${U.m1}'), ('${U.m2}', 'cronjob', 'unset-${U.m2}');`;

const TARGET = requireLocalFixtureTarget();
const AVAILABLE = TARGET.available;
const SKIP = AVAILABLE ? {} : { skip: TARGET.reason };
const psqlArgs = (db) => TARGET.docker.psqlArgs(db);
function run(sql, db = DB) {
  const r = TARGET.docker.runSync(psqlArgs(db), { input: sql });
  return { ok: r.status === 0, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim() };
}
function q(sql, db = DB) { const r = run(sql, db); assert.equal(r.ok, true, `SQL 실패: ${r.err}\n${sql.slice(0, 300)}`); return r.out; }
const errOf = (r) => r.err.replace(/^[\s\S]*?ERROR:\s*/, "").split("\n")[0];
const as = (role, sub, sql) => `set role ${role};\nset request.jwt.claim.sub = '${sub ?? ""}';\n${sql}`;
// 표의 겉모양: 칸(이름·형식·비어도 되는가·기본값)·정책·권한·제약·트리거 — 적용 전과 원복 뒤를 견준다
const shape = () => q(`
select 'cols ' || string_agg(column_name || ':' || data_type || ':' || is_nullable || ':' || coalesce(column_default, '-'), ',' order by ordinal_position) from information_schema.columns where table_schema = 'public' and table_name = 'aif_member_scheduler'
union all select 'pol ' || coalesce(string_agg(policyname || ':' || cmd || ':' || roles::text || ':' || coalesce(qual, '-') || ':' || coalesce(with_check, '-'), ',' order by policyname), '-') from pg_policies where schemaname = 'public' and tablename = 'aif_member_scheduler'
union all select 'acl ' || coalesce((select relacl::text from pg_class where oid = 'public.aif_member_scheduler'::regclass), '-')
union all select 'rls ' || (select relrowsecurity::text || relforcerowsecurity::text from pg_class where oid = 'public.aif_member_scheduler'::regclass)
union all select 'con ' || coalesce(string_agg(conname || ':' || pg_get_constraintdef(oid), ',' order by conname), '-') from pg_constraint where conrelid = 'public.aif_member_scheduler'::regclass
union all select 'trg ' || coalesce(string_agg(tgname, ',' order by tgname), '-') from pg_trigger where tgrelid = 'public.aif_member_scheduler'::regclass and not tgisinternal
union all select 'objs ' || (select count(*)::text from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public') || '/' || (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public');`);
const rows = () => q(`select string_agg(user_id::text || ':' || mode || ':' || active::text || ':' || paused::text || ':' || token_hash, ',' order by user_id) from public.aif_member_scheduler;`);

let createdOid = null, BEFORE_SHAPE = null, BEFORE_ROWS = null;
before(() => {
  if (!AVAILABLE) return;
  assert.equal(q(`select count(*) from pg_database where datname = '${DB}';`, "postgres"), "0", `${DB}가 이미 있습니다 — 건드리지 않고 중단합니다.`);
  q(`create database ${DB};`, "postgres");
  const oid = run(`select oid from pg_database where datname = '${DB}';`, "postgres");
  if (!oid.ok || !/^[0-9]+$/.test(oid.out)) throw new Error(`${DB}를 만들었지만 oid를 확인하지 못했습니다: ${oid.err || oid.out}`);
  createdOid = oid.out;
  q(FIXTURE); q(SEED);
  BEFORE_SHAPE = shape(); BEFORE_ROWS = rows();
});
after(() => {
  if (!AVAILABLE) return;
  if (!createdOid) throw new Error(`[수동 확인 필요] ${DB}를 이 실행이 만들었으나 oid를 확보하지 못해 자동 삭제하지 않았습니다.`);
  const now = run(`select oid from pg_database where datname = '${DB}';`, "postgres");
  if (!now.ok) throw new Error(`${DB}의 oid를 다시 읽지 못했습니다 — 지우지 않았습니다: ${now.err}`);
  if (now.out !== createdOid) throw new Error(`${DB}의 oid가 만든 것(${createdOid})과 다릅니다(${now.out || "없음"}) — 지우지 않았습니다.`);
  const drop = run(`drop database ${DB} with (force);`, "postgres");
  if (!drop.ok) throw new Error(`${DB}를 지우지 못했습니다: ${drop.err}`);
  const left = run(`select count(*) from pg_database where datname = '${DB}' or oid = ${createdOid};`, "postgres");
  if (!left.ok || left.out !== "0") throw new Error(`${DB}가 남아 있습니다: ${left.err || left.out}`);
});

test("적용 전: 원복은 「적용돼 있지 않다」며 멈추고 아무것도 바꾸지 않는다", SKIP, () => {
  const r = run(ROLLBACK);
  assert.equal(r.ok, false); assert.match(errOf(r), /AIF_R1_ROLLBACK_REFUSED: the candidate is not fully applied/);
  assert.equal(shape(), BEFORE_SHAPE); assert.equal(rows(), BEFORE_ROWS);
});

test("적용 전 확인: 대상 표가 없거나 모양이 다르거나 행 단위 보안이 꺼져 있으면 멈춘다(변경 0)", SKIP, () => {
  for (const [name, breakIt, fixIt, pattern] of [
    ["행 단위 보안 꺼짐", "alter table public.aif_member_scheduler disable row level security;", "alter table public.aif_member_scheduler enable row level security;", /row level security is off/],
    ["칸 이름이 다름", "alter table public.aif_member_scheduler rename column paused to paused_x;", "alter table public.aif_member_scheduler rename column paused_x to paused;", /expected columns/],
    ["표 이름이 다름", "alter table public.aif_member_scheduler rename to aif_member_scheduler_x;", "alter table public.aif_member_scheduler_x rename to aif_member_scheduler;", /aif_member_scheduler not found/],
    ["관리자 표식 칸 없음", "alter table public.profiles rename column is_admin to is_admin_x;", "alter table public.profiles rename column is_admin_x to is_admin;", /profiles\(id, is_admin\) not found/],
  ]) {
    q(breakIt);
    const r = run(CANDIDATE);
    q(fixIt);
    assert.equal(r.ok, false, name); assert.match(errOf(r), /AIF_R1_APPLY_REFUSED/, name); assert.match(errOf(r), pattern, name);
    assert.equal(shape(), BEFORE_SHAPE, name + " — 겉모양 그대로"); assert.equal(rows(), BEFORE_ROWS, name);
    assert.equal(q(`select to_regclass('public.aif_platform_scheduler_allowlist') is null;`), "t", name + " — 허용 표가 생기지 않았다");
  }
});

test("적용: 두 칸이 생기고 기존 행은 선택 없음·판 번호 0, 기존 칸·정책·권한은 그대로다", SKIP, () => {
  q(CANDIDATE);
  assert.equal(q(`select string_agg(column_name || ':' || data_type || ':' || is_nullable || ':' || coalesce(column_default, '-'), ',' order by column_name) from information_schema.columns
    where table_schema = 'public' and table_name = 'aif_member_scheduler' and column_name in ('platform_chosen_at', 'mode_rev');`),
    "mode_rev:integer:NO:0,platform_chosen_at:timestamp with time zone:YES:-");
  assert.equal(q(`select count(*) || '/' || count(*) filter (where platform_chosen_at is null and mode_rev = 0) from public.aif_member_scheduler;`), "2/2");
  assert.equal(rows(), BEFORE_ROWS, "기존 칸의 값 그대로");
  const [colsB, polB, aclB, rlsB, conB, trgB] = BEFORE_SHAPE.split("\n"), [cols, pol, acl, rls, con, trg] = shape().split("\n");
  assert.equal(pol, polB, "정책 그대로"); assert.equal(acl, aclB, "권한 그대로"); assert.equal(rls, rlsB); assert.equal(con, conB, "제약 그대로"); assert.equal(trg, trgB);
  assert.equal(cols.startsWith(colsB), true, "기존 칸은 순서·형식·기본값 그대로이고 새 칸은 뒤에 붙었다");
});

test("다시 적용: 이미 적용된 곳에서는 멈춘다(두 번 적용되지 않는다)", SKIP, () => {
  const s = shape(), r = run(CANDIDATE);
  assert.equal(r.ok, false); assert.match(errOf(r), /AIF_R1_APPLY_REFUSED: public.aif_platform_scheduler_allowlist already exists/);
  assert.equal(shape(), s);
});

test("기존 앱 호환: 새 칸을 모르는 코드의 조회·넣기·고치기가 그대로 된다(운영 v1.27과 같은 공용 코드의 모양)", SKIP, () => {
  const old = (sql) => q(as("service_role", null, sql));
  assert.equal(old(`select user_id, mode, active, paused from public.aif_member_scheduler where user_id = '${U.m1}';`), `${U.m1}|vercel|f|f`);
  old(`insert into public.aif_member_scheduler (user_id, token_hash, mode, active, paused) values ('${U.m3}', 'unset-${U.m3}', 'vercel', false, false);`);
  old(`update public.aif_member_scheduler set mode = 'cronjob', updated_at = now() where user_id = '${U.m3}';`);
  old(`insert into public.aif_member_scheduler (user_id, token_hash, mode, active, paused, updated_at) values ('${U.m3}', 'tok', 'cronjob', false, false, now())
       on conflict (user_id) do update set token_hash = excluded.token_hash, mode = excluded.mode, active = excluded.active, paused = excluded.paused, updated_at = excluded.updated_at;`);
  assert.equal(old(`select user_id from public.aif_member_scheduler where mode = 'cronjob' or paused = true order by user_id;`).split("\n").length, 2);
  assert.equal(q(`select mode || ':' || token_hash || ':' || mode_rev || ':' || (platform_chosen_at is null) from public.aif_member_scheduler where user_id = '${U.m3}';`), "cronjob:tok:0:true", "옛 코드가 쓴 행도 선택 없음·판 번호 0");
});

test("회원의 선택: 서비스 역할의 「읽은 판 번호일 때만」 갱신 — 방식과 선택을 한 번에 쓰고, 묵은 번호로는 0행", SKIP, () => {
  const svc = (sql) => q(as("service_role", null, sql));
  const first = svc(`update public.aif_member_scheduler set mode = 'vercel', active = false, platform_chosen_at = now(), mode_rev = 1 where user_id = '${U.m2}' and mode_rev = 0 returning user_id;`);
  assert.match(first, new RegExp(U.m2));
  assert.equal(q(`select mode || ':' || mode_rev || ':' || (platform_chosen_at is not null) from public.aif_member_scheduler where user_id = '${U.m2}';`), "vercel:1:true");
  const stale = svc(`update public.aif_member_scheduler set mode = 'cronjob', platform_chosen_at = null, mode_rev = 1 where user_id = '${U.m2}' and mode_rev = 0 returning user_id;`);
  assert.equal(stale.includes(U.m2), false, "묵은 번호로는 아무 행도 바뀌지 않는다");
  assert.equal(q(`select mode || ':' || mode_rev from public.aif_member_scheduler where user_id = '${U.m2}';`), "vercel:1");
  // 실행 범위 조회와 같은 모양(방식 vercel · 일시정지 아님 · 선택 있음 · 목록 안)
  assert.equal(svc(`select user_id from public.aif_member_scheduler where mode = 'vercel' and paused = false and platform_chosen_at is not null and user_id in ('${U.m1}', '${U.m2}');`), U.m2, "옛 vercel 행(m1)은 선택 기록이 없어 대상이 아니다");
});

test("회원은 자기 행의 새 칸을 읽을 수 있지만, 선택·판 번호를 스스로 쓸 수 없다", SKIP, () => {
  assert.equal(q(as("authenticated", U.m2, `select mode || ':' || mode_rev || ':' || (platform_chosen_at is not null) from public.aif_member_scheduler;`)), "vercel:1:true", "본인 행만 보인다");
  assert.equal(q(as("authenticated", U.m1, `update public.aif_member_scheduler set platform_chosen_at = now(), mode_rev = 99 where user_id = '${U.m1}' returning user_id;`)).includes(U.m1), false, "쓰기 정책이 없어 0행");
  assert.equal(q(as("authenticated", U.m1, `update public.aif_member_scheduler set platform_chosen_at = now() where true returning user_id;`)).includes("-"), false, "남의 행도 0행");
  assert.equal(q(`select (platform_chosen_at is null) || ':' || mode_rev from public.aif_member_scheduler where user_id = '${U.m1}';`), "true:0");
  assert.equal(q(as("anon", null, `select count(*) from public.aif_member_scheduler;`)), "0");
});

test("허용 표의 권한: 익명 접근 불가, 회원은 본인 행 읽기만, 서비스 역할은 읽기·넣기·고치기(삭제 불가)", SKIP, () => {
  assert.equal(q(`select string_agg(r || ':' || has_table_privilege(r, 'public.aif_platform_scheduler_allowlist', 'select')::text || has_table_privilege(r, 'public.aif_platform_scheduler_allowlist', 'insert')::text
      || has_table_privilege(r, 'public.aif_platform_scheduler_allowlist', 'update')::text || has_table_privilege(r, 'public.aif_platform_scheduler_allowlist', 'delete')::text, ',' order by r)
    from unnest(array['anon', 'authenticated', 'service_role']) r;`), "anon:falsefalsefalsefalse,authenticated:truefalsefalsefalse,service_role:truetruetruefalse");
  assert.equal(q(`select relrowsecurity::text from pg_class where oid = 'public.aif_platform_scheduler_allowlist'::regclass;`), "true");
  assert.equal(q(`select policyname || ':' || cmd || ':' || roles::text from pg_policies where schemaname = 'public' and tablename = 'aif_platform_scheduler_allowlist';`), "aif_platform_scheduler_allowlist_select_own:SELECT:{authenticated}");
  assert.equal(q(`select string_agg(r || ':' || has_function_privilege(r, 'public.aif_platform_scheduler_allowlist_guard()', 'execute')::text, ',' order by r) from unnest(array['anon', 'authenticated']) r;`), "anon:false,authenticated:false");
  for (const [who, role, sub] of [["익명", "anon", null], ["회원", "authenticated", U.m1]]) {
    const ins = run(as(role, sub, `insert into public.aif_platform_scheduler_allowlist (user_id, granted_by) values ('${U.m1}', '${U.admin}');`));
    assert.equal(ins.ok, false, who + " 넣기 거절"); assert.match(errOf(ins), /permission denied/);
  }
  assert.match(errOf(run(as("anon", null, `select count(*) from public.aif_platform_scheduler_allowlist;`))), /permission denied/);
  assert.equal(q(`select count(*) from public.aif_platform_scheduler_allowlist;`), "0");
});

test("지정·철회·다시 지정: 적힌 사람이 관리자일 때만 쓸 수 있고, 철회는 행을 지우지 않고 기록으로 남는다", SKIP, () => {
  const svc = (sql) => run(as("service_role", null, sql));
  const allowed = (u) => q(as("service_role", null, `select count(*) from public.aif_platform_scheduler_allowlist where user_id = '${u}' and revoked_at is null;`));
  // 관리자가 아닌 사람 이름으로는 지정할 수 없다(서비스 역할이어도)
  let r = svc(`insert into public.aif_platform_scheduler_allowlist (user_id, granted_by) values ('${U.m1}', '${U.m2}');`);
  assert.equal(r.ok, false); assert.match(errOf(r), /AIF_ALLOWLIST_ADMIN_ONLY: granted_by is not an admin/);
  r = svc(`insert into public.aif_platform_scheduler_allowlist (user_id) values ('${U.m1}');`);
  assert.equal(r.ok, false, "지정한 사람을 비울 수 없다");
  // 지정
  r = svc(`insert into public.aif_platform_scheduler_allowlist (user_id, granted_by, note) values ('${U.m1}', '${U.admin}', '시험 계정');`);
  assert.equal(r.ok, true, r.err); assert.equal(allowed(U.m1), "1");
  assert.equal(q(as("authenticated", U.m1, `select count(*) from public.aif_platform_scheduler_allowlist;`)), "1", "회원은 자기 행을 본다");
  assert.equal(q(as("authenticated", U.m2, `select count(*) from public.aif_platform_scheduler_allowlist;`)), "0", "남의 행은 보이지 않는다");
  // 철회: 관리자가 아니면 거절, 짝(시각·사람)이 안 맞으면 거절
  r = svc(`update public.aif_platform_scheduler_allowlist set revoked_at = now(), revoked_by = '${U.m2}' where user_id = '${U.m1}';`);
  assert.equal(r.ok, false); assert.match(errOf(r), /AIF_ALLOWLIST_ADMIN_ONLY: revoked_by is not an admin/);
  r = svc(`update public.aif_platform_scheduler_allowlist set revoked_at = now() where user_id = '${U.m1}';`);
  assert.equal(r.ok, false, "철회 시각만 적을 수 없다"); assert.match(errOf(r), /revoke_pair/);
  assert.equal(allowed(U.m1), "1", "거절된 철회는 반영되지 않았다");
  r = svc(`update public.aif_platform_scheduler_allowlist set revoked_at = now(), revoked_by = '${U.admin2}' where user_id = '${U.m1}';`);
  assert.equal(r.ok, true, r.err); assert.equal(allowed(U.m1), "0");
  assert.equal(q(`select granted_by::text || ':' || revoked_by::text || ':' || note from public.aif_platform_scheduler_allowlist where user_id = '${U.m1}';`), `${U.admin}:${U.admin2}:시험 계정`, "누가 지정했고 누가 철회했는지 남는다");
  // 다시 지정(철회 칸 비움) — 관리자 아닌 이름으로는 안 된다
  r = svc(`update public.aif_platform_scheduler_allowlist set granted_by = '${U.m3}', granted_at = now(), revoked_at = null, revoked_by = null where user_id = '${U.m1}';`);
  assert.equal(r.ok, false); assert.match(errOf(r), /granted_by is not an admin/);
  r = svc(`update public.aif_platform_scheduler_allowlist set granted_by = '${U.admin2}', granted_at = now(), revoked_at = null, revoked_by = null where user_id = '${U.m1}';`);
  assert.equal(r.ok, true, r.err); assert.equal(allowed(U.m1), "1");
  // 회원 번호는 바꿀 수 없고, 서비스 역할은 행을 지울 수 없다
  r = svc(`update public.aif_platform_scheduler_allowlist set user_id = '${U.m2}' where user_id = '${U.m1}';`);
  assert.equal(r.ok, false); assert.match(errOf(r), /user_id cannot be changed/);
  r = svc(`delete from public.aif_platform_scheduler_allowlist where user_id = '${U.m1}';`);
  assert.equal(r.ok, false); assert.match(errOf(r), /permission denied/);
  // 관리자였던 사람이 관리자가 아니게 돼도 지난 기록은 그대로 읽힌다(쓰는 시점만 확인)
  q(`update public.profiles set is_admin = false where id = '${U.admin2}';`);
  assert.equal(allowed(U.m1), "1");
  r = svc(`update public.aif_platform_scheduler_allowlist set note = '메모만 고침' where user_id = '${U.m1}';`);
  assert.equal(r.ok, true, "지정·철회 칸을 건드리지 않는 고치기는 된다: " + r.err);
  q(`update public.profiles set is_admin = true where id = '${U.admin2}';`);
});

test("허용과 선택은 따로다: 허용만 있어도, 선택만 있어도 「둘 다」가 아니다", SKIP, () => {
  const both = (u) => q(as("service_role", null, `select (exists (select 1 from public.aif_platform_scheduler_allowlist a where a.user_id = '${u}' and a.revoked_at is null))::text || ':' ||
    (exists (select 1 from public.aif_member_scheduler s where s.user_id = '${u}' and s.mode = 'vercel' and s.platform_chosen_at is not null))::text;`));
  assert.equal(both(U.m1), "true:false", "m1: 관리자가 허용했지만 회원이 고르지 않았다(옛 vercel 행)");
  assert.equal(both(U.m2), "false:true", "m2: 회원이 골랐지만 관리자가 허용하지 않았다");
  assert.equal(both(U.m3), "false:false");
});

test("회원이 지워지면 허용 행도 함께 지워진다. 지정한 관리자는 기록이 있는 동안 지울 수 없다", SKIP, () => {
  const tmp = "00000000-0000-4000-8000-0000000000c1";
  q(`insert into auth.users (id) values ('${tmp}'); insert into public.profiles (id) values ('${tmp}');`);
  q(as("service_role", null, `insert into public.aif_platform_scheduler_allowlist (user_id, granted_by) values ('${tmp}', '${U.admin}');`));
  q(`delete from auth.users where id = '${tmp}';`);
  assert.equal(q(`select count(*) from public.aif_platform_scheduler_allowlist where user_id = '${tmp}';`), "0");
  const r = run(`delete from auth.users where id = '${U.admin2}';`);
  assert.equal(r.ok, false, "기록에 적힌 관리자는 지워지지 않는다"); assert.match(errOf(r), /violates foreign key constraint/);
});

test("원복: 자료가 남아 있으면 멈춘다(선택 1건·허용 행 1건) — 아무것도 바뀌지 않는다", SKIP, () => {
  const s = shape(), r = run(ROLLBACK);
  assert.equal(r.ok, false); assert.match(errOf(r), /AIF_R1_ROLLBACK_REFUSED: data would be lost \(1 member choice\(s\), 1 allowlist row\(s\)\)/);
  assert.equal(shape(), s);
  assert.equal(q(`select count(*) from public.aif_platform_scheduler_allowlist;`), "1");
  // 한쪽만 비워도 여전히 멈춘다
  q(`update public.aif_member_scheduler set platform_chosen_at = null where platform_chosen_at is not null;`);
  const r2 = run(ROLLBACK);
  assert.equal(r2.ok, false); assert.match(errOf(r2), /0 member choice\(s\), 1 allowlist row\(s\)/);
  assert.equal(shape(), s);
});

test("원복: 자료를 비운 뒤에는 두 칸·허용 표·확인 함수가 사라지고, 실행 방식 표는 적용 전 겉모양으로 돌아온다", SKIP, () => {
  q(`delete from public.aif_platform_scheduler_allowlist;`);
  assert.equal(q(`select count(*) from public.aif_member_scheduler where mode_rev <> 0;`), "1", "판 번호가 0이 아닌 행이 있어도 원복을 막지 않는다");
  q(ROLLBACK);
  assert.equal(shape(), BEFORE_SHAPE, "칸·정책·권한·제약·트리거·객체 수가 적용 전과 같다");
  assert.equal(q(`select (to_regclass('public.aif_platform_scheduler_allowlist') is null)::text || ':' || (to_regprocedure('public.aif_platform_scheduler_allowlist_guard()') is null)::text;`), "true:true");
  assert.equal(q(`select string_agg(user_id::text || ':' || mode, ',' order by user_id) from public.aif_member_scheduler;`), `${U.m1}:vercel,${U.m2}:vercel,${U.m3}:cronjob`, "방식 값은 원복이 건드리지 않는다");
  // 원복 뒤 다시 적용할 수 있다
  q(CANDIDATE);
  assert.equal(q(`select count(*) filter (where platform_chosen_at is null and mode_rev = 0) || '/' || count(*) from public.aif_member_scheduler;`), "3/3");
  q(ROLLBACK);
  assert.equal(shape(), BEFORE_SHAPE);
});
