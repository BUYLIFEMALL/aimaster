// 운영 적용 회차에 쓸 **읽기 전용 확인 조회문** 2개의 격리 시험 (2026-11-20, CC-SNS-01, Master msg_b591ba3ffe3d).
//   tests/sql/candidates/aif_quota_state_postcheck.sql · aif_r1_scheduler_postcheck.sql
// ★ 실행 이력·결과는 이 파일에 적지 않는다 — docs/analysis-ai-influencer-20261118/W00_BASELINE.md에 적는다.
// 보는 것: 조회문이 (가) 적용 전 (나) 후보 적용 뒤 (다) 고의로 어긋나게 한 뒤 (라) 원복 뒤를 옳게 가르는지, 그리고 읽기 전용 트랜잭션 안에서 도는지.
// 실행: node --test tests/sql/postcheck.test.mjs   (npm test에는 포함되지 않는다)
// 격리: 로컬 Docker 컨테이너 aww-pg-test에 새 DB qa_aif_postcheck_20261120만 만들고(이미 있으면 중단) 끝나면 그 DB만(oid 일치 확인) 지운다.
//       운영·공유 DB 접속 0. 후보·원복·조회문은 이 시험 DB에서만 실행한다. 역할·컨테이너는 만들거나 바꾸지 않는다.
// ★ 한계
//   * 표는 후보와 조회문이 쓰는 칸만 가진 대역이다(a1_it_policy·r1_scheduler 시험과 같은 모양). 운영 표의 제약·자료는 여기 없다.
//   * 함수 소유자는 격리 DB의 postgres(상위 권한)다. 운영 소유자의 실제 권한은 보지 않는다.
//   * 「원문 지문」은 저장소 마이그레이션 파일로 만든 함수의 지문이다. 운영 함수가 그와 같은지는 운영 조회로만 알 수 있다(2026-11-20 사전 읽기에서 일치).
//   * 통과는 「조회문이 이 경우들을 가른다」는 뜻이다. 운영에서 실행했다는 뜻이 아니다.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { requireLocalFixtureTarget } from "./_fixtureGuard.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DB = "qa_aif_postcheck_20261120";
const lf = (t) => t.replace(/\r\n/g, "\n");
const cand = (f) => lf(readFileSync(join(HERE, "candidates", f), "utf8"));
const Q_CANDIDATE = cand("aif_quota_state_candidate.sql"), Q_ROLLBACK = cand("aif_quota_state_rollback.sql"), Q_CHECK = cand("aif_quota_state_postcheck.sql");
const R_CANDIDATE = cand("aif_r1_scheduler_candidate.sql"), R_ROLLBACK = cand("aif_r1_scheduler_rollback.sql"), R_CHECK = cand("aif_r1_scheduler_postcheck.sql");

const MIG = join(HERE, "..", "..", "supabase", "migrations");
const A1_MIGRATIONS = ["20261118120000_aif_assets_a1.sql", "20261118130000_aif_assets_p2_missing.sql", "20261118140000_aif_assets_p3_summary.sql", "20261119100000_aif_assets_grants_fix.sql"]
  .map((f) => readFileSync(join(MIG, f), "utf8"));

// 중앙 정책 함수의 실제 정의(루트 0068에서 글자 그대로) — a1_it_policy 시험과 같은 방법
const centralText = lf(readFileSync(join(HERE, "..", "..", "..", "supabase", "migrations", "0068_storage_posted_retention.sql"), "utf8"));
const C_START = "create function public.member_storage_policy(uid uuid)", C_END = "grant execute on function public.member_storage_policy(uuid) to service_role;";
const csi = centralText.indexOf(C_START), cei = centralText.indexOf(C_END);
if (csi < 0 || cei < csi || centralText.indexOf(C_START, csi + 1) >= 0) throw new Error("0068에서 member_storage_policy 정의를 하나로 찾지 못했습니다 — 시험을 시작하지 않습니다.");
const CENTRAL_POLICY = centralText.slice(csi, cei + C_END.length);

// 실행 방식 표의 실제 정의(프로젝트 마이그레이션에서 글자 그대로) — r1_scheduler 시험과 같은 방법
const schedText = lf(readFileSync(join(MIG, "20261020120000_insta_schedule_v1_15.sql"), "utf8"));
const S_START = "create table if not exists public.aif_member_scheduler (";
const S_END = "create policy aif_member_scheduler_select_own on public.aif_member_scheduler for select to authenticated using (auth.uid() = user_id);";
const ssi = schedText.indexOf(S_START), sei = schedText.indexOf(S_END);
if (ssi < 0 || sei < ssi || schedText.indexOf(S_START, ssi + 1) >= 0) throw new Error("마이그레이션에서 aif_member_scheduler 정의를 하나로 찾지 못했습니다 — 시험을 시작하지 않습니다.");
const SCHEDULER_TABLE = schedText.slice(ssi, sei + S_END.length);

const U1 = "00000000-0000-4000-8000-0000000000c1", U2 = "00000000-0000-4000-8000-0000000000c2";
const TABLES = `
create schema if not exists auth;
create schema if not exists storage;
grant usage on schema public, auth, storage to anon, authenticated, service_role;
create table auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated, service_role;
create table public.storage_plans (slug text primary key, name text not null, quota_bytes bigint not null, retention_days integer, posted_retention_days integer);
create table public.member_grades (id uuid primary key, slug text, storage_plan_slug text references public.storage_plans(slug));
create table public.profiles (
  id uuid primary key,
  is_admin boolean not null default false,
  retention_exempt boolean not null default false,
  retention_exempt_manual boolean not null default false,
  grade_id uuid references public.member_grades(id),
  storage_override_until timestamptz,
  storage_quota_override_bytes bigint,
  storage_retention_override_days integer,
  storage_retention_override_unlimited boolean not null default false
);
create table public.pricing_plans (id uuid primary key, storage_plan_slug text references public.storage_plans(slug));
create table public.subscriptions (id uuid primary key default gen_random_uuid(), user_id uuid not null, pricing_plan_id uuid references public.pricing_plans(id), status text not null, expires_at timestamptz);
create table public.member_storage_usage (user_id uuid primary key references public.profiles(id) on delete cascade, bytes bigint not null default 0,
  file_count integer not null default 0, by_bucket jsonb not null default '{}'::jsonb, measured_at timestamptz not null default now());
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text not null, name text not null, metadata jsonb, created_at timestamptz default now(), unique (bucket_id, name));
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant execute on functions to anon, authenticated, service_role;
grant select on public.profiles to service_role;`;
const SEED = `
insert into auth.users (id, email) values ('${U1}', 'c1@example.test'), ('${U2}', 'c2@example.test');
insert into public.profiles (id) values ('${U1}'), ('${U2}');
insert into public.aif_member_scheduler (user_id, mode, token_hash) values ('${U1}', 'vercel', 'unset-${U1}'), ('${U2}', 'cronjob', 'unset-${U2}');`;

const TARGET = requireLocalFixtureTarget();
const AVAILABLE = TARGET.available;
const SKIP = AVAILABLE ? {} : { skip: TARGET.reason };
function run(sql, db = DB) {
  const r = TARGET.docker.runSync(TARGET.docker.psqlArgs(db), { input: sql });
  return { ok: r.status === 0, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim() };
}
function q(sql, db = DB) { const r = run(sql, db); assert.equal(r.ok, true, `SQL 실패: ${r.err}\n${sql.slice(0, 300)}`); return r.out; }
/** 조회문을 **읽기 전용 트랜잭션** 안에서 돌린다 — 무엇이든 쓰려 하면 여기서 실패한다 */
const check = (sql) => JSON.parse(q(`begin transaction read only;\n${sql}\ncommit;`));
const fnOf = (res, name) => res.functions.find((f) => f.name === name || f.signature?.startsWith(name + "("));

let createdOid = null;
before(() => {
  if (!AVAILABLE) return;
  assert.equal(q(`select count(*) from pg_roles where rolname in ('anon','authenticated','service_role') and not rolcanlogin and not rolsuper;`, "postgres"), "3",
    "필요한 역할 3개가 예상 속성으로 있지 않습니다 — 역할을 만들지 않고 중단합니다.");
  assert.equal(q(`select count(*) from pg_database where datname = '${DB}';`, "postgres"), "0", `${DB}가 이미 있습니다 — 건드리지 않고 중단합니다.`);
  q(`create database ${DB};`, "postgres");
  const oid = run(`select oid from pg_database where datname = '${DB}';`, "postgres");
  if (!oid.ok || !/^[0-9]+$/.test(oid.out)) throw new Error(`${DB}를 만들었지만 oid를 확인하지 못했습니다: ${oid.err || oid.out}`);
  createdOid = oid.out;
  q(TABLES); q(CENTRAL_POLICY);
  for (const m of A1_MIGRATIONS) q(m);
  q(SCHEDULER_TABLE);
  q(`grant all on public.aif_member_scheduler to anon, authenticated, service_role;`);
  q(SEED);
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

test("정적: 두 조회문은 주석을 빼면 조회 문 하나이고 쓰는 낱말이 없다", () => {
  for (const [name, sql] of [["quota", Q_CHECK], ["r1", R_CHECK]]) {
    const body = sql.split("\n").map((l) => l.replace(/--.*$/, "")).join("\n").trim();
    assert.equal(body.split(";").filter((s) => s.trim()).length, 1, name + " — 문 하나");
    assert.match(body, /^with\b/i, name);
    // 따옴표 안의 글자 값(권한 이름 'insert' 등)은 명령이 아니므로 빼고 본다
    const noStrings = body.replace(/E?'(?:[^']|'')*'/g, "''");
    assert.doesNotMatch(noStrings, /\b(insert|update|delete|alter|drop|create|grant|revoke|truncate|comment|lock|set|call|do)\b/i, name + " — 쓰는 낱말 없음");
  }
});

// ── 저장 한도 판정 ──
test("한도: 적용 전에는 'original'이고 세 함수 지문이 저장소 원문과 같다", SKIP, () => {
  const r = check(Q_CHECK);
  assert.equal(r.state, "original"); assert.equal(r.original_ok, true); assert.equal(r.candidate_ok, false);
  assert.equal(fnOf(r, "aif_asset_quota_snapshot").present, false);
  for (const n of ["aif_asset_usage_estimate", "aif_asset_precheck", "aif_asset_reserve"]) assert.equal(fnOf(r, n).matches, "original", n);
  assert.deepEqual(r.snapshot_callers, []);
});

test("한도: 후보 적용 뒤에는 'candidate'이고 전부 일치한다", SKIP, () => {
  q(Q_CANDIDATE);
  const r = check(Q_CHECK);
  assert.equal(r.state, "candidate"); assert.equal(r.candidate_ok, true); assert.equal(r.original_ok, false); assert.equal(r.owner_count, 1);
  for (const f of r.functions) {
    assert.equal(f.matches, "candidate", f.name); assert.equal(f.security_definer, true, f.name);
    assert.equal(f.exec_anon, false, f.name); assert.equal(f.exec_authenticated, false, f.name); assert.equal(f.exec_service_role, true, f.name);
  }
  assert.deepEqual(r.snapshot_callers, ["aif_asset_precheck", "aif_asset_reserve", "aif_asset_usage_estimate"]);
});

test("한도: 고의로 어긋나게 하면 잡는다(회원 역할 실행 권한 · 표식 없음 · 본문 한 글자)", SKIP, () => {
  for (const [name, breakIt, fixIt] of [
    ["회원 역할에 실행 권한", "grant execute on function public.aif_asset_quota_snapshot(uuid) to authenticated;", "revoke execute on function public.aif_asset_quota_snapshot(uuid) from authenticated;"],
    ["표식 없음", "comment on function public.aif_asset_quota_snapshot(uuid) is null;", "comment on function public.aif_asset_quota_snapshot(uuid) is 'AIF quota-state candidate v1 (aif_asset_quota_snapshot)';"],
  ]) {
    q(breakIt);
    const r = check(Q_CHECK);
    q(fixIt);
    assert.equal(r.candidate_ok, false, name); assert.equal(r.state, "mixed", name);
  }
  // 본문이 달라짐: 감싸개 함수 본문에 빈칸 하나를 더한다 → 지문 불일치. 그 뒤 후보를 다시 적용해 되돌린다(후보는 자기 표식이 있으면 다시 적용된다).
  q(`create or replace function public.aif_asset_usage_estimate(p_user uuid)
returns table (used_bytes bigint, quota_bytes bigint, measured_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query select s.used_bytes, s.quota_bytes, s.measured_at  from public.aif_asset_quota_snapshot(p_user) s;
end $$;`);
  const r = check(Q_CHECK);
  assert.equal(r.candidate_ok, false); assert.equal(r.state, "mixed"); assert.equal(fnOf(r, "aif_asset_usage_estimate").matches, "other");
  q(Q_CANDIDATE);
  assert.equal(check(Q_CHECK).candidate_ok, true, "다시 적용하면 일치로 돌아온다");
});

test("한도: 원복 뒤에는 다시 'original'이다", SKIP, () => {
  q(Q_ROLLBACK);
  const r = check(Q_CHECK);
  assert.equal(r.state, "original"); assert.equal(r.original_ok, true); assert.equal(r.candidate_ok, false);
});

// ── R1 예약 실행 방식 ──
test("R1: 적용 전에는 'not_applied'이고 기존 행 수를 센다", SKIP, () => {
  const r = check(R_CHECK);
  assert.equal(r.state, "not_applied"); assert.equal(r.applied_ok, false); assert.equal(r.scheduler_rows, 2);
  assert.equal(r.columns.new_columns, 0); assert.equal(r.functions_named_like_prefix, 0);
});

test("R1: 후보 적용 뒤에는 'applied'이고 전부 일치한다", SKIP, () => {
  q(R_CANDIDATE);
  const r = check(R_CHECK);
  assert.equal(r.state, "applied"); assert.equal(r.applied_ok, true); assert.equal(r.scheduler_rows, 2);
  assert.equal(r.functions.length, 7); assert.equal(r.functions_named_like_prefix, 7); assert.equal(r.indexes_present, 2);
  for (const f of r.functions) { assert.equal(f.present, true, f.signature); assert.equal(f.acl_ok, true, f.signature); assert.equal(f.security_definer, true, f.signature); }
  for (const t of r.tables) { assert.equal(t.rls, true, t.name); assert.equal(t.policies, 0, t.name); assert.equal(t.open_api_privileges, 0, t.name); }
});

test("R1: 고의로 어긋나게 하면 잡는다(표 권한 · 함수 권한 · 색인 · 정책 · 검색 경로 · 같은 머리글의 다른 함수)", SKIP, () => {
  const FN = "public.aif_platform_scheduler_";
  for (const [name, breakIt, fixIt] of [
    ["서비스 역할에 이력 표 읽기", "grant select on public.aif_platform_scheduler_allowlist_events to service_role;", "revoke select on public.aif_platform_scheduler_allowlist_events from service_role;"],
    ["서비스 역할에 관리자 함수 실행", `grant execute on function ${FN}admin_set(uuid, boolean, text) to service_role;`, `revoke execute on function ${FN}admin_set(uuid, boolean, text) from service_role;`],
    ["색인 하나 없음", "drop index public.aif_platform_scheduler_allowlist_events_at_idx;", "create index aif_platform_scheduler_allowlist_events_at_idx on public.aif_platform_scheduler_allowlist_events (at);"],
    ["허용 표에 정책이 생김", "create policy x_tmp on public.aif_platform_scheduler_allowlist for select to authenticated using (true);", "drop policy x_tmp on public.aif_platform_scheduler_allowlist;"],
    ["검색 경로가 다름", `alter function ${FN}is_allowed(uuid) set search_path = public;`, `alter function ${FN}is_allowed(uuid) set search_path = pg_catalog, pg_temp;`],
    ["같은 머리글의 다른 함수", `create function ${FN}extra() returns integer language sql as $$ select 1 $$;`, `drop function ${FN}extra();`],
  ]) {
    q(breakIt);
    const r = check(R_CHECK);
    q(fixIt);
    assert.equal(r.applied_ok, false, name);
  }
  assert.equal(check(R_CHECK).applied_ok, true, "되돌린 뒤에는 다시 일치");
});

test("R1: 일부만 있으면 'partial'이다(새 칸 하나를 지운 상태)", SKIP, () => {
  q(`alter table public.aif_member_scheduler drop column platform_chosen_at;`);
  const r = check(R_CHECK);
  q(`alter table public.aif_member_scheduler add column platform_chosen_at timestamptz;`);
  assert.equal(r.state, "partial"); assert.equal(r.applied_ok, false);
});

test("R1: 원복 뒤에는 다시 'not_applied'이고 행 수가 그대로다", SKIP, () => {
  q(R_ROLLBACK);
  const r = check(R_CHECK);
  assert.equal(r.state, "not_applied"); assert.equal(r.applied_ok, false); assert.equal(r.scheduler_rows, 2);
});
