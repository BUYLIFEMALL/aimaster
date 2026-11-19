// R1 DB 후보(두 칸 + 허용 저장소: 표 2개·함수 7개)의 적용·권한·관리자 신원·동시성·원복 격리 시험
// (2026-11-19, CC-SNS-01, Master msg_d5a93c1e9c7d · msg_2d25cdee75db — Mac 정적 검수 P2 반영).
// ★ 실행 이력·결과는 이 파일에 적지 않는다 — ai-influencer-studio/docs/PLAN_20261119_R1_SCHEDULER_DEFAULT.md §13·§14에 적는다.
// 실행: node --test tests/sql/r1_scheduler.test.mjs   (npm test에는 포함되지 않는다. 잠금 시간 초과 시험 때문에 20초쯤 걸린다)
// 격리: 로컬 Docker 컨테이너 aww-pg-test에 새 DB qa_aif_r1_20261119만 만들고(이미 있으면 중단) 끝나면 그 DB만(oid 일치 확인) 지운다.
//       운영·공유 DB 접속 0. 후보는 tests/sql/candidates/에 있고 이 시험 DB에서만 실행한다.
// ★ 한계
//   * 실행 방식 표의 정의는 프로젝트 마이그레이션 파일에서 글자 그대로 잘라 왔다. auth.users·profiles는 이 시험이 쓰는 칸만 가진 대역이다.
//   * 호출은 PostgREST를 거치지 않는다. 「로그인한 회원」은 역할 바꾸기 + 요청 회원 번호 설정(request.jwt.claim.sub)으로 옮겼다 — 실제 로그인 토큰 검증은 여기 없다.
//   * 함수는 격리 DB의 소유자(postgres, 상위 권한)로 돈다. 운영 소유자의 실제 권한·행 단위 보안 우회 여부는 보지 않았다.
//   * 동시성 시험은 두 접속을 시간차로 겹친다(먼저 시작한 접속이 변경을 쥐고 잠들어 있는 동안 다른 접속을 보낸다). 순서는 결과로 확인한다 — 겹치지 않았다면 결과가 달라진다.
//   * 「기존 앱 호환」은 공용 코드가 보내는 것과 같은 모양의 SQL로만 본다. 실제 앱을 돌리지 않는다.
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
create table auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated, service_role;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, is_admin boolean not null default false);
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant execute on functions to anon, authenticated, service_role;
grant select on public.profiles to service_role;
${SCHEDULER_TABLE}
grant all on public.aif_member_scheduler to anon, authenticated, service_role;`;

const U = { admin: "00000000-0000-4000-8000-0000000000a1", admin2: "00000000-0000-4000-8000-0000000000a2", m1: "00000000-0000-4000-8000-0000000000b1", m2: "00000000-0000-4000-8000-0000000000b2", m3: "00000000-0000-4000-8000-0000000000b3", gone: "00000000-0000-4000-8000-0000000000ff" };
const SEED = `
insert into auth.users (id, email) values ('${U.admin}', 'admin@example.test'), ('${U.admin2}', 'admin2@example.test'), ('${U.m1}', 'm1@example.test'), ('${U.m2}', 'm2@example.test'), ('${U.m3}', 'm3@example.test');
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
// 다른 접속 하나를 따로 띄운다(끝나면 결과와 걸린 시간을 돌려준다)
function session(sql) {
  const started = Date.now();
  return new Promise((resolve) => {
    const p = TARGET.docker.spawn(psqlArgs(DB)); let out = "", err = "";
    p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => resolve({ ok: code === 0, out: out.trim(), err: err.trim(), ms: Date.now() - started }));
    p.stdin.end(sql);
  });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const errOf = (r) => r.err.replace(/^[\s\S]*?ERROR:\s*/, "").split("\n")[0];
const as = (role, sub, sql) => `set role ${role};\nset request.jwt.claim.sub = '${sub ?? ""}';\n${sql}`;
const lastLine = (s) => s.split("\n").pop();
const FN = "public.aif_platform_scheduler_";
const adminSet = (admin, user, allow, note = null) => as("authenticated", admin, `select ${FN}admin_set('${user}', ${allow}, ${note === null ? "null" : `'${note}'`});`);
const isAllowed = (u) => lastLine(q(as("service_role", null, `select ${FN}is_allowed('${u}');`)));
const state = () => q(`select coalesce((select string_agg(user_id::text || ':' || (revoked_at is null)::text, ',' order by user_id) from public.aif_platform_scheduler_allowlist), '-') || ' | 이력 ' || (select count(*) from public.aif_platform_scheduler_allowlist_events);`);
// 실행 방식 표의 겉모양: 칸·정책·권한·제약·트리거·스키마 객체 수 — 적용 전과 원복 뒤를 견준다
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

// ── 적용 ──
test("적용 전: 원복은 「적용돼 있지 않다」며 멈추고 아무것도 바꾸지 않는다", SKIP, () => {
  const r = run(ROLLBACK);
  assert.equal(r.ok, false); assert.match(errOf(r), /AIF_R1_ROLLBACK_REFUSED: the candidate is not fully applied/);
  assert.equal(shape(), BEFORE_SHAPE); assert.equal(rows(), BEFORE_ROWS);
});

test("적용 전 확인: 대상이 기대한 모양이 아니면 멈춘다(5가지, 변경 0)", SKIP, () => {
  for (const [name, breakIt, fixIt, pattern] of [
    ["행 단위 보안 꺼짐", "alter table public.aif_member_scheduler disable row level security;", "alter table public.aif_member_scheduler enable row level security;", /row level security is off/],
    ["칸 이름이 다름", "alter table public.aif_member_scheduler rename column paused to paused_x;", "alter table public.aif_member_scheduler rename column paused_x to paused;", /expected columns/],
    ["표 이름이 다름", "alter table public.aif_member_scheduler rename to aif_member_scheduler_x;", "alter table public.aif_member_scheduler_x rename to aif_member_scheduler;", /aif_member_scheduler not found/],
    ["관리자 표식 칸 없음", "alter table public.profiles rename column is_admin to is_admin_x;", "alter table public.profiles rename column is_admin_x to is_admin;", /profiles\(id, is_admin\) not found/],
    ["같은 이름의 함수가 이미 있음", "create function public.aif_platform_scheduler_is_allowed() returns boolean language sql as $$ select true $$;", "drop function public.aif_platform_scheduler_is_allowed();", /a function named aif_platform_scheduler_\* already exists/],
  ]) {
    q(breakIt);
    const r = run(CANDIDATE);
    q(fixIt);
    assert.equal(r.ok, false, name); assert.match(errOf(r), /AIF_R1_APPLY_REFUSED/, name); assert.match(errOf(r), pattern, name);
    assert.equal(shape(), BEFORE_SHAPE, name + " — 겉모양 그대로"); assert.equal(rows(), BEFORE_ROWS, name);
    assert.equal(q(`select (to_regclass('public.aif_platform_scheduler_allowlist') is null)::text;`), "true", name + " — 허용 표가 생기지 않았다");
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
  assert.equal(r.ok, false); assert.match(errOf(r), /AIF_R1_APPLY_REFUSED: the allowlist tables already exist/);
  assert.equal(shape(), s);
});

test("기존 앱 호환: 새 칸을 모르는 코드의 조회·넣기·고치기가 그대로 된다(운영 v1.27과 같은 공용 코드의 모양)", SKIP, () => {
  const old = (sql) => lastLine(q(as("service_role", null, sql)));
  assert.equal(old(`select user_id, mode, active, paused from public.aif_member_scheduler where user_id = '${U.m1}';`), `${U.m1}|vercel|f|f`);
  q(as("service_role", null, `insert into public.aif_member_scheduler (user_id, token_hash, mode, active, paused) values ('${U.m3}', 'unset-${U.m3}', 'vercel', false, false);
    update public.aif_member_scheduler set mode = 'cronjob', updated_at = now() where user_id = '${U.m3}';
    insert into public.aif_member_scheduler (user_id, token_hash, mode, active, paused, updated_at) values ('${U.m3}', 'tok', 'cronjob', false, false, now())
      on conflict (user_id) do update set token_hash = excluded.token_hash, mode = excluded.mode, active = excluded.active, paused = excluded.paused, updated_at = excluded.updated_at;`));
  assert.equal(q(`select count(*) from public.aif_member_scheduler where mode = 'cronjob' or paused = true;`), "2");
  assert.equal(q(`select mode || ':' || token_hash || ':' || mode_rev || ':' || (platform_chosen_at is null) from public.aif_member_scheduler where user_id = '${U.m3}';`), "cronjob:tok:0:true", "옛 코드가 쓴 행도 선택 없음·판 번호 0");
});

// ── 회원의 선택(실행 방식 표의 두 칸) ──
test("회원의 선택: 서비스 역할의 「읽은 판 번호일 때만」 갱신 — 방식과 선택을 한 번에 쓰고, 묵은 번호로는 0행", SKIP, () => {
  const svc = (sql) => q(as("service_role", null, sql));
  assert.match(svc(`update public.aif_member_scheduler set mode = 'vercel', active = false, platform_chosen_at = now(), mode_rev = 1 where user_id = '${U.m2}' and mode_rev = 0 returning user_id;`), new RegExp(U.m2));
  assert.equal(q(`select mode || ':' || mode_rev || ':' || (platform_chosen_at is not null) from public.aif_member_scheduler where user_id = '${U.m2}';`), "vercel:1:true");
  assert.equal(svc(`update public.aif_member_scheduler set mode = 'cronjob', platform_chosen_at = null, mode_rev = 1 where user_id = '${U.m2}' and mode_rev = 0 returning user_id;`).includes(U.m2), false, "묵은 번호로는 아무 행도 바뀌지 않는다");
  assert.equal(q(`select mode || ':' || mode_rev from public.aif_member_scheduler where user_id = '${U.m2}';`), "vercel:1");
  assert.equal(lastLine(svc(`select user_id from public.aif_member_scheduler where mode = 'vercel' and paused = false and platform_chosen_at is not null and user_id in ('${U.m1}', '${U.m2}');`)), U.m2, "옛 vercel 행(m1)은 선택 기록이 없어 실행 범위 조회에 들지 않는다");
});

test("회원은 자기 행의 새 칸을 읽을 수 있지만, 선택·판 번호를 스스로 쓸 수 없다", SKIP, () => {
  assert.equal(lastLine(q(as("authenticated", U.m2, `select mode || ':' || mode_rev || ':' || (platform_chosen_at is not null) from public.aif_member_scheduler;`))), "vercel:1:true", "본인 행만 보인다");
  assert.equal(q(as("authenticated", U.m1, `update public.aif_member_scheduler set platform_chosen_at = now(), mode_rev = 99 where user_id = '${U.m1}' returning user_id;`)).includes(U.m1), false, "쓰기 정책이 없어 0행");
  assert.equal(q(`select (platform_chosen_at is null) || ':' || mode_rev from public.aif_member_scheduler where user_id = '${U.m1}';`), "true:0");
  assert.equal(lastLine(q(as("anon", null, `select count(*) from public.aif_member_scheduler;`))), "0");
});

// ── 허용 저장소: 권한 ──
test("허용 표 2개는 어떤 API 역할에게도 직접 열려 있지 않다 — 서비스 역할도 표를 직접 읽거나 쓰지 못한다", SKIP, () => {
  assert.equal(q(`select string_agg(t || '/' || r || ':' || has_table_privilege(r, 'public.' || t, 'select')::text || has_table_privilege(r, 'public.' || t, 'insert')::text
      || has_table_privilege(r, 'public.' || t, 'update')::text || has_table_privilege(r, 'public.' || t, 'delete')::text, ',' order by t, r)
    from unnest(array['aif_platform_scheduler_allowlist', 'aif_platform_scheduler_allowlist_events']) t, unnest(array['anon', 'authenticated', 'service_role']) r;`),
    ["allowlist", "allowlist_events"].flatMap((t) => ["anon", "authenticated", "service_role"].map((r) => `aif_platform_scheduler_${t}/${r}:falsefalsefalsefalse`)).join(","));
  assert.equal(q(`select string_agg(relname || ':' || relrowsecurity::text, ',' order by relname) from pg_class where oid in ('public.aif_platform_scheduler_allowlist'::regclass, 'public.aif_platform_scheduler_allowlist_events'::regclass);`),
    "aif_platform_scheduler_allowlist:true,aif_platform_scheduler_allowlist_events:true");
  assert.equal(q(`select count(*) from pg_policies where schemaname = 'public' and tablename like 'aif_platform_scheduler_allowlist%';`), "0", "정책 0개");
  for (const [who, role, sub] of [["익명", "anon", null], ["회원", "authenticated", U.m1], ["관리자 회원", "authenticated", U.admin], ["서비스 역할", "service_role", null]]) {
    for (const sql of [`select count(*) from public.aif_platform_scheduler_allowlist;`, `select note, granted_by from public.aif_platform_scheduler_allowlist;`, `select count(*) from public.aif_platform_scheduler_allowlist_events;`,
      `insert into public.aif_platform_scheduler_allowlist (user_id, granted_by) values ('${U.m1}', '${U.admin}');`, `insert into public.aif_platform_scheduler_allowlist_events (user_id, action, actor_id) values ('${U.m1}', 'granted', '${U.admin}');`,
      `delete from public.aif_platform_scheduler_allowlist_events;`]) {
      const r = run(as(role, sub, sql));
      assert.equal(r.ok, false, `${who}: ${sql.slice(0, 50)}`); assert.match(errOf(r), /permission denied/, who);
    }
  }
  assert.equal(state(), "- | 이력 0");
});

test("함수 실행 권한: 허용 여부 2개는 서비스 역할만, 관리자용 3개는 로그인한 회원 역할만, 신원 확인 함수는 아무도 직접 부르지 못한다", SKIP, () => {
  assert.equal(q(`select string_agg(p.proname || ':' || has_function_privilege('anon', p.oid, 'execute')::text || has_function_privilege('authenticated', p.oid, 'execute')::text || has_function_privilege('service_role', p.oid, 'execute')::text
      || ':' || p.prosecdef::text || ':' || coalesce(array_to_string(p.proconfig, ','), '-'), E'\\n' order by p.proname)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'aif\\_platform\\_scheduler\\_%';`),
    ["admin_actor:falsefalsefalse", "admin_history:falsetruefalse", "admin_list:falsetruefalse", "admin_set:falsetruefalse", "allowed_users:falsefalsetrue", "is_allowed:falsefalsetrue", "purge_history:falsefalsetrue"]
      .map((x) => `aif_platform_scheduler_${x}:true:search_path=pg_catalog, pg_temp`).join("\n"));
  // 함수 본문은 public·auth의 객체를 전부 스키마 이름을 붙여 부른다(이름만 적은 표·함수 호출이 없다)
  const bodies = q(`select string_agg(p.prosrc, E'\\n') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'aif\\_platform\\_scheduler\\_%';`);
  for (const name of ["aif_platform_scheduler_allowlist", "aif_platform_scheduler_allowlist_events", "aif_platform_scheduler_admin_actor", "profiles"]) {
    const bare = bodies.split(name).length - 1 - (bodies.split("public." + name).length - 1);
    assert.equal(bare, 0, `${name}: 스키마 이름 없이 불린 곳이 없어야 한다`);
  }
  assert.equal((bodies.match(/(^|[^.\w])users\b/g) ?? []).length, 0, "users는 auth.users로만 부른다");
  assert.equal((bodies.match(/(^|[^.\w])uid\(\)/g) ?? []).length, 0, "uid()는 auth.uid()로만 부른다");
  // 회원은 자기 허용 여부도 직접 묻지 못한다(앱 서버가 판정해 알려 준다)
  for (const sql of [`select ${FN}is_allowed('${U.m1}');`, `select * from ${FN}allowed_users();`, `select ${FN}admin_actor();`]) {
    const r = run(as("authenticated", U.m1, sql)); assert.equal(r.ok, false, sql); assert.match(errOf(r), /permission denied/);
  }
  for (const sql of [`select ${FN}admin_set('${U.m1}', true, null);`, `select * from ${FN}admin_list();`, `select * from ${FN}admin_history('${U.m1}');`, `select ${FN}admin_actor();`]) {
    for (const role of ["anon", "service_role"]) { const r = run(as(role, null, sql)); assert.equal(r.ok, false, `${role}: ${sql}`); assert.match(errOf(r), /permission denied/); }
  }
  assert.equal(state(), "- | 이력 0");
});

// ── 허용 저장소: 관리자 신원 ──
test("관리자 신원: 로그인 신원이 없거나 관리자가 아니면 지정·철회·목록·이력이 모두 거절되고 아무것도 바뀌지 않는다", SKIP, () => {
  for (const [who, sub] of [["일반 회원", U.m1], ["신원 없음", null], ["없는 회원 번호", U.gone]]) {
    for (const sql of [`select ${FN}admin_set('${U.m1}', true, '몰래');`, `select ${FN}admin_set('${U.m1}', false, null);`, `select * from ${FN}admin_list();`, `select * from ${FN}admin_history('${U.m1}');`]) {
      const r = run(as("authenticated", sub, sql));
      assert.equal(r.ok, false, `${who}: ${sql}`); assert.match(errOf(r), /AIF_ALLOWLIST_ADMIN_ONLY: this action needs a signed-in admin/, who);
    }
  }
  // 자기 자신을 지정하려는 회원도 같다
  assert.match(errOf(run(adminSet(U.m2, U.m2, true))), /AIF_ALLOWLIST_ADMIN_ONLY/);
  assert.equal(state(), "- | 이력 0"); assert.equal(isAllowed(U.m1), "f");
  // 관리자라도 요청이 틀리면 거절(대상 없음·값 빠짐) — 상태·이력 그대로
  assert.match(errOf(run(adminSet(U.admin, U.gone, true))), /AIF_ALLOWLIST_TARGET_NOT_FOUND/);
  assert.match(errOf(run(as("authenticated", U.admin, `select ${FN}admin_set(null, true, null);`))), /AIF_ALLOWLIST_BAD_REQUEST/);
  assert.match(errOf(run(as("authenticated", U.admin, `select ${FN}admin_set('${U.m1}', null, null);`))), /AIF_ALLOWLIST_BAD_REQUEST/);
  assert.equal(state(), "- | 이력 0");
});

test("이름 가로채기: 같은 이름의 임시 표를 만들어 둬도 함수는 public의 진짜 표만 본다(검색 경로 고정 + 스키마 이름 명시)", SKIP, () => {
  // 회원이 자기 접속에 「자기가 관리자라고 적힌 profiles」와 「자기가 허용된 allowlist」를 임시 표로 만들어 둔 상황
  const forge = `create temp table profiles (id uuid, is_admin boolean); insert into profiles values ('${U.m1}', true);
    create temp table aif_platform_scheduler_allowlist (user_id uuid, revoked_at timestamptz, granted_at timestamptz, granted_by uuid, revoked_by uuid, note text); insert into aif_platform_scheduler_allowlist (user_id) values ('${U.m1}');
    create temp table users (id uuid); insert into users values ('${U.gone}');`;
  const r = run(`${forge}\n${adminSet(U.m1, U.m1, true, "가로채기")}`);
  assert.equal(r.ok, false); assert.match(errOf(r), /AIF_ALLOWLIST_ADMIN_ONLY/, "임시 profiles로 관리자가 되지 못한다");
  assert.equal(lastLine(q(`${forge}\n${as("service_role", null, `select ${FN}is_allowed('${U.m1}');`)}`)), "f", "임시 allowlist로 허용이 되지 못한다");
  assert.equal(lastLine(q(`${forge}\n${as("service_role", null, `select count(*) from ${FN}allowed_users();`)}`)), "0");
  // 진짜 관리자가 「없는 회원」을 지정하려 할 때 임시 users 표가 대상 확인을 속이지 못한다
  const r2 = run(`${forge}\n${adminSet(U.admin, U.gone, true, null)}`);
  assert.equal(r2.ok, false); assert.match(errOf(r2), /AIF_ALLOWLIST_TARGET_NOT_FOUND/);
  assert.equal(state(), "- | 이력 0");
});

test("상태 전이와 이력: 지정 → (다시 지정은 그대로) → 철회 → (다시 철회는 그대로) → 재허용. 바뀐 호출만 이력에 남고, 한 사람은 로그인 신원에서 온다", SKIP, () => {
  const set = (admin, user, allow, note) => lastLine(q(adminSet(admin, user, allow, note)));
  assert.equal(set(U.admin, U.m1, false, null), "unchanged", "지정된 적 없는 회원의 철회는 아무 일도 하지 않는다");
  assert.equal(state(), "- | 이력 0");
  assert.equal(set(U.admin, U.m1, true, "시험 계정"), "granted"); assert.equal(isAllowed(U.m1), "t");
  assert.equal(set(U.admin2, U.m1, true, "또 지정"), "unchanged", "이미 허용 — 지정한 사람·메모가 바뀌지 않는다");
  assert.equal(set(U.admin2, U.m1, false, "철회 사유"), "revoked"); assert.equal(isAllowed(U.m1), "f");
  assert.equal(set(U.admin, U.m1, false, null), "unchanged");
  assert.equal(set(U.admin2, U.m1, true, "다시 허용"), "regranted"); assert.equal(isAllowed(U.m1), "t");
  assert.equal(state(), `${U.m1}:true | 이력 3`);
  const history = q(as("authenticated", U.admin, `select action || ':' || actor_id::text || ':' || coalesce(note, '-') from ${FN}admin_history('${U.m1}');`)).split("\n").slice(-3);
  assert.deepEqual(history, [`granted:${U.admin}:시험 계정`, `revoked:${U.admin2}:철회 사유`, `regranted:${U.admin2}:다시 허용`]);
  // 이력에는 이메일 같은 개인 식별 글자가 없다(칸 자체가 없고, 어느 칸에도 @ 글자가 없다)
  assert.equal(q(`select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_schema = 'public' and table_name = 'aif_platform_scheduler_allowlist_events';`), "id,user_id,action,actor_id,note,at");
  assert.equal(q(`select count(*) from public.aif_platform_scheduler_allowlist_events e where e::text like '%@%';`), "0");
  assert.equal(q(`select pg_get_function_result('${FN}admin_history(uuid)'::regprocedure);`), "TABLE(id bigint, action text, actor_id uuid, note text, at timestamp with time zone)");
  assert.equal(lastLine(q(as("authenticated", U.admin2, `select user_id::text || ':' || allowed::text || ':' || granted_by::text || ':' || (revoked_at is null)::text || ':' || note from ${FN}admin_list();`))), `${U.m1}:true:${U.admin2}:true:다시 허용`);
  // 관리자 자격이 없어진 사람은 그 순간부터 못 한다(지난 이력은 그대로)
  q(`update public.profiles set is_admin = false where id = '${U.admin2}';`);
  assert.match(errOf(run(adminSet(U.admin2, U.m1, false, "자격 없음"))), /AIF_ALLOWLIST_ADMIN_ONLY/);
  q(`update public.profiles set is_admin = true where id = '${U.admin2}';`);
  assert.equal(state(), `${U.m1}:true | 이력 3`);
});

test("앱 서버가 얻는 것은 허용 여부뿐이다: 참·거짓과 회원 번호 목록 — 메모·지정한 사람·시각은 나오지 않는다", SKIP, () => {
  assert.equal(isAllowed(U.m1), "t"); assert.equal(isAllowed(U.m2), "f"); assert.equal(isAllowed(U.gone), "f");
  assert.equal(lastLine(q(as("service_role", null, `select string_agg(u::text, ',') from ${FN}allowed_users() u;`))), U.m1);
  assert.equal(q(`select pg_get_function_result('${FN}is_allowed(uuid)'::regprocedure) || ' / ' || pg_get_function_result('${FN}allowed_users()'::regprocedure);`), "boolean / SETOF uuid");
  // 철회된 회원은 목록에서 빠진다
  q(adminSet(U.admin, U.m3, true, null)); q(adminSet(U.admin, U.m3, false, null));
  assert.equal(lastLine(q(as("service_role", null, `select string_agg(u::text, ',') from ${FN}allowed_users() u;`))), U.m1);
});

test("허용과 선택은 따로다: 허용만 있어도, 선택만 있어도 「둘 다」가 아니다", SKIP, () => {
  const both = (u) => isAllowed(u) + ":" + q(`select (exists (select 1 from public.aif_member_scheduler s where s.user_id = '${u}' and s.mode = 'vercel' and s.platform_chosen_at is not null))::text;`);
  assert.equal(both(U.m1), "t:false", "m1: 관리자가 허용했지만 회원이 고르지 않았다(옛 vercel 행)");
  assert.equal(both(U.m2), "f:true", "m2: 회원이 골랐지만 관리자가 허용하지 않았다");
  assert.equal(both(U.m3), "f:false");
});

// ── 보관 정책(1년) ──
test("보관 1년: 1년이 지난 이력과 철회한 지 1년이 지난 허용 행만 지운다 — 지금 허용 중인 행과 1년 안의 기록은 그대로다. 서비스 역할만 부를 수 있다", SKIP, () => {
  const before = state();
  const oldUser = "00000000-0000-4000-8000-0000000000e1", oldActive = "00000000-0000-4000-8000-0000000000e2", edge = "00000000-0000-4000-8000-0000000000e3";
  q(`insert into auth.users (id, email) values ('${oldUser}', 'e1@example.test'), ('${oldActive}', 'e2@example.test'), ('${edge}', 'e3@example.test');
     insert into public.profiles (id) values ('${oldUser}'), ('${oldActive}'), ('${edge}');
     -- 철회한 지 13개월 된 행 / 13개월 전에 지정돼 지금도 허용 중인 행 / 철회한 지 11개월 된 행
     insert into public.aif_platform_scheduler_allowlist (user_id, granted_at, granted_by, revoked_at, revoked_by, note) values
       ('${oldUser}', now() - interval '14 months', '${U.admin}', now() - interval '13 months', '${U.admin}', '오래된 철회'),
       ('${oldActive}', now() - interval '13 months', '${U.admin}', null, null, '오래됐지만 허용 중'),
       ('${edge}', now() - interval '12 months', '${U.admin}', now() - interval '11 months', '${U.admin}', '11개월 전 철회');
     -- 13개월 전 이력 2줄 / 11개월 전 이력 1줄
     insert into public.aif_platform_scheduler_allowlist_events (user_id, action, actor_id, note, at) values
       ('${oldUser}', 'granted', '${U.admin}', '오래된 지정', now() - interval '14 months'),
       ('${oldUser}', 'revoked', '${U.admin}', '오래된 철회', now() - interval '13 months'),
       ('${edge}', 'revoked', '${U.admin}', '11개월 전 철회', now() - interval '11 months');`);
  for (const [role, sub] of [["anon", null], ["authenticated", U.m1], ["authenticated", U.admin]]) {
    const r = run(as(role, sub, `select * from ${FN}purge_history();`));
    assert.equal(r.ok, false, role); assert.match(errOf(r), /permission denied/, "관리자 회원도 직접 부르지 못한다");
  }
  assert.equal(lastLine(q(as("service_role", null, `select events_deleted || ':' || rows_deleted from ${FN}purge_history();`))), "2:1");
  assert.equal(q(`select string_agg(user_id::text || ':' || (revoked_at is null)::text, ',' order by user_id) from public.aif_platform_scheduler_allowlist where user_id in ('${oldUser}', '${oldActive}', '${edge}');`),
    `${oldActive}:true,${edge}:false`, "철회한 지 1년 넘은 행만 사라졌다");
  assert.equal(isAllowed(oldActive), "t", "오래 전에 지정됐어도 허용 중이면 그대로 허용");
  assert.equal(q(`select count(*) || ':' || min(note) from public.aif_platform_scheduler_allowlist_events where user_id in ('${oldUser}', '${edge}');`), "1:11개월 전 철회");
  assert.equal(lastLine(q(as("service_role", null, `select events_deleted || ':' || rows_deleted from ${FN}purge_history();`))), "0:0", "다시 불러도 더 지우지 않는다");
  // 뒷정리(이 시험이 넣은 것만) — 뒤 시험의 건수에 영향을 주지 않게
  q(`delete from public.aif_platform_scheduler_allowlist_events where user_id = '${edge}'; delete from auth.users where id in ('${oldUser}', '${oldActive}', '${edge}');`);
  assert.equal(state(), before);
});

test("메모는 200자까지: 넘으면 지정이 거절되고(상태·이력 변화 0), 표에 직접 넣어도 제약이 막는다", SKIP, () => {
  const before = state(), long = "가".repeat(201);
  const r = run(adminSet(U.admin, U.m3, true, long));
  assert.equal(r.ok, false); assert.match(errOf(r), /AIF_ALLOWLIST_BAD_REQUEST: note is longer than 200 characters/);
  assert.equal(state(), before);
  assert.match(errOf(run(`insert into public.aif_platform_scheduler_allowlist_events (user_id, action, actor_id, note) values ('${U.m3}', 'granted', '${U.admin}', '${long}');`)), /violates check constraint/);
  assert.match(errOf(run(`update public.aif_platform_scheduler_allowlist set note = '${long}' where user_id = '${U.m1}';`)), /aif_platform_scheduler_allowlist_note_len/);
  assert.equal(state(), before);
});

test("잠금 순서: 관리자 지정·정리·원복이 모두 「허용 표 → 이력 표」 순서로 잡는다(엇갈리면 겹쳤을 때 서로 기다리다 멈출 수 있다)", SKIP, () => {
  const src = (fn) => q(`select prosrc from pg_proc where oid = '${FN}${fn}'::regprocedure;`);
  const first = (text, needle) => { const i = text.indexOf(needle); assert.notEqual(i, -1, needle); return i; };
  const purge = src("purge_history()");
  assert.equal(first(purge, "delete from public.aif_platform_scheduler_allowlist a") < first(purge, "delete from public.aif_platform_scheduler_allowlist_events e"), true, "정리: 허용 표를 먼저");
  const set = src("admin_set(uuid, boolean, text)");
  const lastAllow = Math.max(set.lastIndexOf("update public.aif_platform_scheduler_allowlist\n"), set.lastIndexOf("insert into public.aif_platform_scheduler_allowlist ("), set.lastIndexOf("from public.aif_platform_scheduler_allowlist a where a.user_id = p_user for update"));
  assert.equal(lastAllow > 0 && lastAllow < first(set, "insert into public.aif_platform_scheduler_allowlist_events"), true, "지정·철회: 허용 표의 일이 모두 끝난 뒤 이력에 쓴다");
  assert.equal(ROLLBACK.includes("lock table public.aif_member_scheduler, public.aif_platform_scheduler_allowlist, public.aif_platform_scheduler_allowlist_events in access exclusive mode;"), true, "원복: 세 표를 같은 순서로 한꺼번에");
});

test("정리와 관리자 재허용이 겹칠 때(재허용이 먼저): 정리는 기다렸다가 「지금은 허용 중」인 그 행을 지우지 않는다", SKIP, async () => {
  const before = state(), u = "00000000-0000-4000-8000-0000000000f1";
  q(`insert into auth.users (id) values ('${u}'); insert into public.profiles (id) values ('${u}');
     insert into public.aif_platform_scheduler_allowlist (user_id, granted_at, granted_by, revoked_at, revoked_by) values ('${u}', now() - interval '14 months', '${U.admin}', now() - interval '13 months', '${U.admin}');`);
  const regrant = session(as("authenticated", U.admin, `begin; select ${FN}admin_set('${u}', true, '겹친 재허용'); select pg_sleep(1.5); commit;`));
  await wait(500);
  const purge = await session(as("service_role", null, `select events_deleted || ':' || rows_deleted from ${FN}purge_history();`));
  const a = await regrant;
  assert.equal(a.ok && purge.ok, true, a.err + purge.err);
  assert.match(a.out, /regranted/);
  assert.equal(purge.ms >= 700, true, `정리가 재허용이 끝날 때까지 기다렸다(${purge.ms}ms)`);
  assert.equal(lastLine(purge.out), "0:0", "재허용된 행은 정리 대상이 아니다");
  assert.equal(isAllowed(u), "t");
  q(`delete from auth.users where id = '${u}'; delete from public.aif_platform_scheduler_allowlist_events where user_id = '${u}';`);
  assert.equal(state(), before);
});

test("정리와 관리자 지정이 겹칠 때(정리가 먼저): 지정은 기다렸다가 새로 지정된다 — 지워진 행을 붙잡고 실패하지 않는다", SKIP, async () => {
  const before = state(), u = "00000000-0000-4000-8000-0000000000f2";
  q(`insert into auth.users (id) values ('${u}'); insert into public.profiles (id) values ('${u}');
     insert into public.aif_platform_scheduler_allowlist (user_id, granted_at, granted_by, revoked_at, revoked_by) values ('${u}', now() - interval '14 months', '${U.admin}', now() - interval '13 months', '${U.admin}');`);
  const purge = session(as("service_role", null, `begin; select events_deleted || ':' || rows_deleted from ${FN}purge_history(); select pg_sleep(1.5); commit;`));
  await wait(500);
  const grant = await session(adminSet(U.admin, u, true, "정리 직후 지정"));
  const p = await purge;
  assert.equal(p.ok && grant.ok, true, p.err + grant.err);
  assert.match(p.out, /0:1/, "정리가 오래된 철회 행을 지웠다");
  assert.equal(grant.ms >= 700, true, `지정이 정리가 끝날 때까지 기다렸다(${grant.ms}ms)`);
  assert.equal(lastLine(grant.out), "granted", "행이 지워진 뒤라 새 지정이다");
  assert.equal(isAllowed(u), "t");
  q(`delete from auth.users where id = '${u}'; delete from public.aif_platform_scheduler_allowlist_events where user_id = '${u}';`);
  assert.equal(state(), before);
});

test("지정 도중 정리가 끼어들 때: 넣기가 기존 철회 행과 부딪힌 직후 정리가 그 행을 지워도, 「변화 없음」이라고 거짓으로 답하지 않는다 — 실제로 허용되고 이력은 한 줄이다", SKIP, async () => {
  const before = state(), u = "00000000-0000-4000-8000-0000000000f3";
  q(`insert into auth.users (id) values ('${u}'); insert into public.profiles (id) values ('${u}');
     insert into public.aif_platform_scheduler_allowlist (user_id, granted_at, granted_by, revoked_at, revoked_by) values ('${u}', now() - interval '14 months', '${U.admin}', now() - interval '13 months', '${U.admin}');`);
  // 그 틈을 벌리는 시험 전용 장치: 허용 표에 「넣기 문장이 끝난 직후」 1.5초 쉬는 문장 단위 트리거(0행을 넣은 문장에도 돈다). 시험이 끝나면 지운다.
  q(`create function public.qa_pause_after_insert() returns trigger language plpgsql as $$ begin perform pg_sleep(1.5); return null; end $$;
     create trigger qa_pause_after_insert after insert on public.aif_platform_scheduler_allowlist for each statement execute function public.qa_pause_after_insert();`);
  let grant, purge;
  try {
    const granting = session(adminSet(U.admin, u, true, "틈 사이 지정"));
    await wait(600);   // 지정이 넣기(부딪힘)를 끝내고 쉬는 동안
    purge = await session(as("service_role", null, `select events_deleted || ':' || rows_deleted from ${FN}purge_history();`));
    grant = await granting;
  } finally {
    q(`drop trigger qa_pause_after_insert on public.aif_platform_scheduler_allowlist; drop function public.qa_pause_after_insert();`);
  }
  assert.equal(purge.ok, true, purge.err); assert.equal(lastLine(purge.out), "0:1", "정리가 그 틈에 오래된 철회 행을 지웠다(틈이 실제로 벌어졌다)");
  assert.equal(purge.ms < 1200, true, `정리는 기다리지 않고 지나갔다(${purge.ms}ms)`);
  assert.equal(grant.ok, true, grant.err);
  const answer = lastLine(grant.out), allowedNow = isAllowed(u);
  const events = q(`select count(*) from public.aif_platform_scheduler_allowlist_events where user_id = '${u}';`);
  assert.equal(`${answer} / 허용 ${allowedNow} / 이력 ${events}`, "granted / 허용 t / 이력 1", "답·실제 상태·이력이 서로 맞아야 한다");
  q(`delete from auth.users where id = '${u}'; delete from public.aif_platform_scheduler_allowlist_events where user_id = '${u}';`);
  assert.equal(state(), before);
});

// ── 동시성 ──
test("동시 지정: 두 관리자가 같은 회원을 같은 순간 지정해도 한 번만 지정되고 이력도 한 줄이다", SKIP, async () => {
  const target = "00000000-0000-4000-8000-0000000000d1";
  q(`insert into auth.users (id, email) values ('${target}', 'd1@example.test'); insert into public.profiles (id) values ('${target}');`);
  const call = (admin) => session(as("authenticated", admin, `begin; select ${FN}admin_set('${target}', true, null); select pg_sleep(1.2); commit;`));
  const first = call(U.admin); await wait(400); const second = call(U.admin2);
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a.ok && b.ok, true, a.err + b.err);
  const results = [a, b].map((r) => r.out.split("\n").find((l) => /granted|unchanged/.test(l))).sort();
  assert.deepEqual(results, ["granted", "unchanged"]);
  assert.equal(b.ms >= 600, true, "나중 요청은 먼저 요청이 끝날 때까지 기다렸다");
  assert.equal(q(`select count(*) from public.aif_platform_scheduler_allowlist_events where user_id = '${target}';`), "1");
  assert.equal(q(`select granted_by::text from public.aif_platform_scheduler_allowlist where user_id = '${target}';`), U.admin, "먼저 지정한 관리자가 남는다");
});

// ── 계정이 지워질 때 ──
test("회원이 지워지면 허용 행은 함께 지워지고 이력은 남는다. 지정한 관리자 계정도 막힘 없이 지울 수 있고 이력에는 그 번호만 남는다", SKIP, () => {
  const target = "00000000-0000-4000-8000-0000000000d1", tmpAdmin = "00000000-0000-4000-8000-0000000000a9";
  q(`delete from auth.users where id = '${target}';`);
  assert.equal(q(`select count(*) from public.aif_platform_scheduler_allowlist where user_id = '${target}';`), "0");
  assert.equal(q(`select count(*) from public.aif_platform_scheduler_allowlist_events where user_id = '${target}';`), "1", "이력은 남는다");
  q(`insert into auth.users (id, email) values ('${tmpAdmin}', 'temp-admin@example.test'); insert into public.profiles (id, is_admin) values ('${tmpAdmin}', true);`);
  q(adminSet(tmpAdmin, U.m2, true, "임시 관리자가 지정"));
  q(`delete from auth.users where id = '${tmpAdmin}';`);   // 막히지 않는다
  assert.equal(q(`select count(*) from auth.users where id = '${tmpAdmin}';`), "0");
  assert.equal(isAllowed(U.m2), "t", "지정은 유효하게 남는다");
  assert.equal(lastLine(q(as("authenticated", U.admin, `select actor_id::text || ':' || action from ${FN}admin_history('${U.m2}');`))), `${tmpAdmin}:granted`, "한 사람의 번호는 이력에 남는다(이메일은 남기지 않는다)");
  assert.equal(q(`select count(*) from public.aif_platform_scheduler_allowlist_events e where e::text like '%@%';`), "0");
  q(adminSet(U.admin, U.m2, false, null));
});

// ── 원복 ──
test("원복: 자료가 남아 있으면 멈춘다 — 선택·허용 행·이력 가운데 하나만 남아도(건수를 알려 준다)", SKIP, () => {
  const s = shape();
  const refused = (pattern) => { const r = run(ROLLBACK); assert.equal(r.ok, false); assert.match(errOf(r), /AIF_R1_ROLLBACK_REFUSED: data would be lost/); assert.match(errOf(r), pattern); assert.equal(shape(), s); };
  // 이력 8건 = m1 3(지정·철회·재허용) + m3 2(지정·철회) + 동시 지정 대상 1 + m2 2(임시 관리자 지정·철회)
  refused(/1 member choice\(s\), 3 allowlist row\(s\), 8 history event\(s\)/);
  q(`update public.aif_member_scheduler set platform_chosen_at = null where platform_chosen_at is not null;`);
  refused(/0 member choice\(s\), 3 allowlist row\(s\), 8 history event\(s\)/);
  q(`delete from public.aif_platform_scheduler_allowlist;`);
  refused(/0 member choice\(s\), 0 allowlist row\(s\), 8 history event\(s\)/);
  q(`delete from public.aif_platform_scheduler_allowlist_events;`);
  assert.equal(state(), "- | 이력 0");
});

test("원복 동시성: 확인 뒤 지우기 전에 끼어드는 쓰기가 없다 — 진행 중인 선택 쓰기가 끝나길 기다렸다가 그 결과를 보고 멈춘다", SKIP, async () => {
  const s = shape();
  const writer = session(as("service_role", null, `begin; update public.aif_member_scheduler set mode = 'vercel', platform_chosen_at = now(), mode_rev = mode_rev + 1 where user_id = '${U.m1}'; select pg_sleep(1.5); commit;`));
  await wait(500);
  const rb = await session(ROLLBACK);
  assert.equal((await writer).ok, true);
  assert.equal(rb.ok, false, "원복은 그 쓰기를 보고 멈춰야 한다 — 기다리지 않았다면 칸을 지워 버렸을 것이다"); assert.match(errOf(rb), /1 member choice\(s\), 0 allowlist row\(s\), 0 history event\(s\)/);
  assert.equal(rb.ms >= 700, true, `원복이 쓰기가 끝날 때까지 기다렸다(${rb.ms}ms)`);
  assert.equal(shape(), s);
  assert.equal(q(`select (platform_chosen_at is not null)::text from public.aif_member_scheduler where user_id = '${U.m1}';`), "true", "회원의 선택은 그대로 있다");
  q(`update public.aif_member_scheduler set platform_chosen_at = null where platform_chosen_at is not null;`);
});

test("원복 동시성: 진행 중인 관리자 지정이 끝나길 기다렸다가 그 결과(허용 행·이력)를 보고 멈춘다", SKIP, async () => {
  const s = shape();
  const writer = session(as("authenticated", U.admin, `begin; select ${FN}admin_set('${U.m3}', true, '원복과 겹친 지정'); select pg_sleep(1.5); commit;`));
  await wait(500);
  const rb = await session(ROLLBACK);
  assert.equal((await writer).ok, true);
  assert.equal(rb.ok, false); assert.match(errOf(rb), /0 member choice\(s\), 1 allowlist row\(s\), 1 history event\(s\)/);
  assert.equal(rb.ms >= 700, true, `원복이 지정이 끝날 때까지 기다렸다(${rb.ms}ms)`);
  assert.equal(shape(), s); assert.equal(isAllowed(U.m3), "t", "지정은 그대로 있다");
  q(`delete from public.aif_platform_scheduler_allowlist; delete from public.aif_platform_scheduler_allowlist_events;`);
});

test("원복 동시성: 진행 중인 정리 호출이 끝나길 기다렸다가 판단한다 — 서로 기다리다 멈추지 않는다", SKIP, async () => {
  const s = shape();
  // 정리가 지울 것이 있는 상태: 13개월 전 이력 1줄 + 최근 이력 1줄(이것이 남아 원복을 멈추게 한다)
  q(`insert into public.aif_platform_scheduler_allowlist_events (user_id, action, actor_id, at) values ('${U.m3}', 'granted', '${U.admin}', now() - interval '13 months'), ('${U.m3}', 'revoked', '${U.admin}', now());`);
  const purge = session(as("service_role", null, `begin; select events_deleted || ':' || rows_deleted from ${FN}purge_history(); select pg_sleep(1.5); commit;`));
  await wait(500);
  const rb = await session(ROLLBACK);
  const p = await purge;
  assert.equal(p.ok, true, p.err); assert.match(p.out, /1:0/);
  assert.equal(rb.ok, false); assert.doesNotMatch(rb.err, /deadlock/);
  assert.match(errOf(rb), /0 member choice\(s\), 0 allowlist row\(s\), 1 history event\(s\)/, "정리가 끝난 뒤의 상태(이력 1줄 남음)를 보고 멈췄다");
  assert.equal(rb.ms >= 700, true, `원복이 정리가 끝날 때까지 기다렸다(${rb.ms}ms)`);
  assert.equal(shape(), s);
  q(`delete from public.aif_platform_scheduler_allowlist_events;`);
});

test("원복 동시성: 10초 안에 잠그지 못하면 아무것도 바꾸지 않고 오류로 끝난다(무한정 기다리지 않는다)", SKIP, async () => {
  const s = shape();
  const holder = session(`begin; lock table public.aif_platform_scheduler_allowlist in share mode; select pg_sleep(11.5); commit;`);
  await wait(500);
  const rb = await session(ROLLBACK);
  assert.equal(rb.ok, false); assert.match(errOf(rb), /lock timeout/);
  assert.equal(rb.ms >= 9000 && rb.ms < 11500, true, `10초쯤에서 포기했다(${rb.ms}ms)`);
  await holder;
  assert.equal(shape(), s);
});

test("원복: 자료를 비운 뒤에는 두 칸·허용 표 2개·함수 7개가 사라지고, 실행 방식 표는 적용 전 겉모양으로 돌아온다(다시 적용·다시 원복 가능)", SKIP, () => {
  assert.equal(q(`select (count(*) filter (where mode_rev <> 0) > 0)::text from public.aif_member_scheduler;`), "true", "판 번호가 0이 아닌 행이 있어도 원복을 막지 않는다");
  q(ROLLBACK);
  assert.equal(shape(), BEFORE_SHAPE, "칸·정책·권한·제약·트리거·스키마 객체 수가 적용 전과 같다");
  assert.equal(q(`select (to_regclass('public.aif_platform_scheduler_allowlist') is null)::text || ':' || (to_regclass('public.aif_platform_scheduler_allowlist_events') is null)::text || ':' ||
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'aif\\_platform\\_scheduler\\_%');`), "true:true:0");
  q(CANDIDATE);
  assert.equal(q(`select count(*) filter (where platform_chosen_at is null and mode_rev = 0) || '/' || count(*) from public.aif_member_scheduler;`), "3/3");
  q(ROLLBACK);
  assert.equal(shape(), BEFORE_SHAPE);
});
