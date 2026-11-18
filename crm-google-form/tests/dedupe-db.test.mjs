// CRM-20261118-02 2A — 중복 방지 마이그레이션 원문을 격리 DB에서 검증(운영·Lab·공유 DB 접속 0, 새 패키지 0).
// 실행: node --test crm-google-form/tests/dedupe-db.test.mjs
// Docker 컨테이너 aww-pg-test 안에 실행마다 고유한 새 DB(qa_crm_dedupe_<시각36진수>_<pid>)를 만들고,
// 이 실행이 직접 만든 그 DB만 끝에 지운다. 같은 이름 DB가 이미 있으면 아무것도 지우지 않고 멈춘다.
// aww·aww_dev·mb_* 등 기존 DB와 다른 실행의 DB는 손대지 않는다(이중 실행해도 이름이 달라 서로 간섭 0).
// 클러스터 전역 역할(anon·authenticated·service_role)은 없을 때만 만들고(동시 생성 경합은 duplicate_object를
// 무시), 이미 있으면 정의(로그인 불가·service_role은 RLS 우회)만 확인한다 — 역할 변경·삭제 0.
// Docker가 없으면 시험을 건너뛴다(skip).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const C = "aww-pg-test";
const DB = `qa_crm_dedupe_${Date.now().toString(36)}_${process.pid}`;
let CREATED = false;
const read = (p) => readFileSync(join(ROOT, p), "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
const BASE = read("supabase/migrations/0001_crm_google_form_tables.sql");
const MIG = read("supabase/migrations/20261118120000_crm_submission_dedupe.sql");

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const SA = "aaaaaaaa-1111-4111-8111-000000000001";
const SB = "bbbbbbbb-1111-4111-8111-000000000002";
const SA2 = "aaaaaaaa-2222-4222-8222-000000000003"; // 같은 회원 A의 두 번째 폼

const docker = spawnSync("docker", ["exec", C, "true"], { encoding: "utf8" });
const SKIP = docker.status !== 0 ? "Docker 컨테이너 aww-pg-test 없음" : false;

/** psql 한 번 실행. ok=false면 stderr에 오류. */
function sql(text, db = DB) {
  const r = spawnSync(
    "docker",
    ["exec", "-i", C, "psql", "-X", "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1", "-q", "-At", "-F", "|", "-f", "-"],
    { input: text, encoding: "utf8" },
  );
  return { ok: r.status === 0, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim() };
}
function must(text) {
  const r = sql(text);
  assert.ok(r.ok, r.err);
  return r.out;
}
/** 독립 연결 하나(별도 psql 프로세스)로 비동기 실행 */
function sqlAsync(text) {
  return new Promise((resolve) => {
    const p = spawn("docker", ["exec", "-i", C, "psql", "-X", "-U", "postgres", "-d", DB, "-v", "ON_ERROR_STOP=1", "-q", "-At", "-f", "-"]);
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => resolve({ ok: code === 0, out: out.trim(), err: err.trim() }));
    p.stdin.end(text);
  });
}
const asUser = (uid, body) =>
  `begin; set local "request.jwt.claim.sub" = '${uid}'; set local role authenticated;\n${body}\ncommit;`;

/** 행 지문: 모든 행의 모든 칸 값(id 순). dedupe_key는 칸이 생긴 뒤에도 비교에서 빼고(정규화), NULL 여부는 따로 검사한다. */
const rowFp = () =>
  must(`select count(*)||':'||md5(coalesce(string_agg((to_jsonb(s) - 'dedupe_key')::text, E'\\n' order by s.id), '')) from public.crm_submissions s`);
/** 보안 지문: 표 ACL·RLS 켜짐/강제·정책 전체 정의(종류·대상 역할·조건)·칸별 명시 ACL·표 권한 목록 — 이름만 비교하지 않는다. */
const secFp = () =>
  must(`select string_agg(x, E'\\n' order by x) from (
    select 'relacl:'||coalesce(relacl::text,'∅')||' rls:'||relrowsecurity||' force:'||relforcerowsecurity x from pg_class where oid='public.crm_submissions'::regclass
    union all select 'policy:'||policyname||'|'||permissive||'|'||roles::text||'|'||cmd||'|'||coalesce(qual,'∅')||'|'||coalesce(with_check,'∅') from pg_policies where schemaname='public' and tablename='crm_submissions'
    union all select 'attacl:'||attname||':'||attacl::text from pg_attribute where attrelid='public.crm_submissions'::regclass and attacl is not null
    union all select 'grant:'||grantee||':'||privilege_type||':'||is_grantable from information_schema.role_table_grants where table_schema='public' and table_name='crm_submissions') t`);
/** 구조 지문: 칸·제약 정의·인덱스 정의 + 보안 지문 + 행 지문 — 멈춤 뒤 「아무것도 안 바뀜」 비교용 */
const shape = () =>
  must(`select string_agg(x, ' ; ' order by x) from (
    select 'col:'||attname||':'||format_type(atttypid, atttypmod)||':'||attnotnull x from pg_attribute where attrelid='public.crm_submissions'::regclass and attnum>0 and not attisdropped
    union all select 'con:'||conname||':'||pg_get_constraintdef(oid) from pg_constraint where conrelid='public.crm_submissions'::regclass
    union all select 'idx:'||pg_get_indexdef(indexrelid) from pg_index where indrelid='public.crm_submissions'::regclass) t`) +
  "\n" + secFp() + "\n" + rowFp();

before(() => {
  if (SKIP) return;
  const exists = spawnSync("docker", ["exec", C, "psql", "-U", "postgres", "-lqt"], { encoding: "utf8" }).stdout ?? "";
  if (exists.split("\n").some((l) => l.split("|")[0].trim() === DB)) {
    throw new Error(`[멈춤] 같은 이름 DB ${DB}가 이미 있습니다 — 지우지 않고 중단`);
  }
  const c = spawnSync("docker", ["exec", C, "psql", "-U", "postgres", "-q", "-c", `create database ${DB}`], { encoding: "utf8" });
  assert.equal(c.status, 0, c.stderr);
  CREATED = true;
  // 전역 역할: 없을 때만 만들고, 다른 실행과 동시에 만들다 겹치면(duplicate_object) 무시. 기존 역할 변경 0.
  for (const [role, opts] of [["anon", "nologin"], ["authenticated", "nologin"], ["service_role", "nologin bypassrls"]]) {
    must(`do $$ begin
  if not exists (select 1 from pg_roles where rolname='${role}') then
    begin create role ${role} ${opts}; exception when duplicate_object then null; end;
  end if;
end $$;`);
  }
  assert.equal(
    must("select string_agg(rolname||':login='||rolcanlogin||':bypassrls='||rolbypassrls, ',' order by rolname) from pg_roles where rolname in ('anon','authenticated','service_role')"),
    "anon:login=false:bypassrls=false,authenticated:login=false:bypassrls=false,service_role:login=false:bypassrls=true",
    "[멈춤] 전역 역할 정의가 예상과 다름 — 바꾸지 않고 중단",
  );
  must(`
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
grant usage on schema auth to anon, authenticated, service_role;
create function public.set_updated_at() returns trigger language plpgsql as $f$ begin new.updated_at = now(); return new; end $f$;
alter default privileges in schema public grant all on tables to anon, authenticated;
`);
  must(BASE); // 0001 원문 그대로(crm_submissions를 만드는 유일한 파일)
  must(`
insert into auth.users (id) values ('${A}'), ('${B}');
insert into public.crm_form_sources (id, user_id, name, webhook_token) values ('${SA}','${A}','A폼', gen_random_uuid()), ('${SB}','${B}','B폼', gen_random_uuid()), ('${SA2}','${A}','A폼2', gen_random_uuid());
insert into public.crm_submissions (user_id, form_source_id, status, response_id) values
  ('${A}','${SA}','received','old-1'), ('${A}','${SA}','notified','old-2'), ('${B}','${SB}','failed','old-3');
`);
});

after(() => {
  if (SKIP || !CREATED) return; // 이 실행이 만든 DB만 지운다
  spawnSync("docker", ["exec", C, "psql", "-U", "postgres", "-q", "-c", `drop database if exists ${DB}`]);
});

test("멈춤: 인덱스 이름이 이미 있으면 아무것도 바꾸지 않는다", { skip: SKIP }, () => {
  must("create index crm_submissions_dedupe_uq on public.crm_submissions (name)");
  const s0 = shape();
  const r = sql(MIG);
  assert.equal(r.ok, false);
  assert.match(r.err, /\[멈춤\] crm_submissions_dedupe_uq 이름이 이미 있습니다/);
  assert.equal(shape(), s0);
  must("drop index public.crm_submissions_dedupe_uq");
});

test("멈춤: status 제약 정의가 다르면 아무것도 바꾸지 않는다", { skip: SKIP }, () => {
  must(`alter table public.crm_submissions drop constraint crm_submissions_status_check;
        alter table public.crm_submissions add constraint crm_submissions_status_check check (status in ('received','notified','failed','x'))`);
  const s0 = shape();
  const r = sql(MIG);
  assert.equal(r.ok, false);
  assert.match(r.err, /\[멈춤\] status 검사 제약 정의가 예상과 다릅니다/);
  assert.equal(shape(), s0);
  must(`alter table public.crm_submissions drop constraint crm_submissions_status_check;
        alter table public.crm_submissions add constraint crm_submissions_status_check check (status in ('received','notified','failed'))`);
});

test("멈춤: status 제약이 2개면 아무것도 바꾸지 않는다", { skip: SKIP }, () => {
  must("alter table public.crm_submissions add constraint extra_status_nonempty check (status <> '')");
  const s0 = shape();
  const r = sql(MIG);
  assert.equal(r.ok, false);
  assert.match(r.err, /\[멈춤\] status 검사 제약이 1개가 아닙니다\(2개\)/);
  assert.equal(shape(), s0);
  must("alter table public.crm_submissions drop constraint extra_status_nonempty");
});

test("멈춤: 다른 연결이 표를 잡고 있으면 lock_timeout으로 전체 취소", { skip: SKIP }, async () => {
  const s0 = shape();
  const holder = sqlAsync("begin; lock table public.crm_submissions in access exclusive mode; select pg_sleep(8); commit;");
  await new Promise((r) => setTimeout(r, 1500));
  const t0 = Date.now();
  const r = await sqlAsync(MIG);
  const waited = Date.now() - t0;
  assert.equal(r.ok, false);
  assert.match(r.err, /lock timeout/i);
  assert.ok(waited < 7500, `lock_timeout 5초 안에 끝나야 함(${waited}ms)`);
  await holder;
  assert.equal(shape(), s0);
});

test("적용: 칸·부분 유니크·제약 확장, 기존 행·상태 그대로, 채우기 0", { skip: SKIP }, () => {
  const before = must("select string_agg(response_id||':'||status, ',' order by response_id) from public.crm_submissions");
  const rowsBefore = rowFp();
  const secBefore = secFp();
  const r = sql(MIG);
  assert.ok(r.ok, r.err);
  // 기존 행의 모든 칸 값 그대로(새 칸 dedupe_key만 비교에서 빼고 아래에서 NULL 확인), 권한·RLS·정책 전체 정의 그대로
  assert.equal(rowFp(), rowsBefore);
  assert.equal(secFp(), secBefore);
  assert.equal(must("select count(*) from public.crm_submissions where dedupe_key is not null"), "0");
  assert.equal(
    must("select string_agg(response_id||':'||status||':'||coalesce(dedupe_key,'NULL'), ',' order by response_id) from public.crm_submissions"),
    before.split(",").map((x) => `${x}:NULL`).join(","),
  );
  assert.equal(
    must("select pg_get_indexdef('public.crm_submissions_dedupe_uq'::regclass)"),
    "CREATE UNIQUE INDEX crm_submissions_dedupe_uq ON public.crm_submissions USING btree (user_id, form_source_id, dedupe_key) WHERE (dedupe_key IS NOT NULL)",
  );
  assert.equal(
    must("select conname||'='||pg_get_constraintdef(oid) from pg_constraint where conrelid='public.crm_submissions'::regclass and contype='c'"),
    "crm_submissions_status_check=CHECK ((status = ANY (ARRAY['received'::text, 'notified'::text, 'failed'::text, 'dispatching'::text, 'partial'::text, 'unknown'::text])))",
  );
  // 권한·정책 변화 0: 정책 3개 그대로
  assert.equal(must("select string_agg(policyname, ',' order by policyname) from pg_policies where tablename='crm_submissions'"),
    "crm_submissions_owner_delete,crm_submissions_owner_insert,crm_submissions_owner_select");
});

test("다시 실행하면 멈춤(이미 적용) — 두 번 적용 0", { skip: SKIP }, () => {
  const s0 = shape();
  const r = sql(MIG);
  assert.equal(r.ok, false);
  assert.match(r.err, /\[멈춤\] dedupe_key 칸이 이미 있습니다/);
  assert.equal(shape(), s0);
});

test("상태: 새 3개 허용, 목록 밖 값 거절", { skip: SKIP }, () => {
  for (const s of ["dispatching", "partial", "unknown", "received", "notified", "failed"]) {
    assert.ok(sql(`begin; update public.crm_submissions set status='${s}' where response_id='old-1'; rollback;`).ok, s);
  }
  const bad = sql("update public.crm_submissions set status='sent' where response_id='old-1'");
  assert.equal(bad.ok, false);
  assert.match(bad.err, /crm_submissions_status_check/);
});

test("회원 간 격리: A가 B의 source·같은 키로 먼저 넣어도 B(서버) 선점은 막히지 않는다", { skip: SKIP }, () => {
  // 0001 회원 insert 정책은 user_id만 검사 → A는 B의 source id로 자기 행을 넣을 수 있다(정책 변경은 별도 검토)
  must(asUser(A, `insert into public.crm_submissions (user_id, form_source_id, dedupe_key) values ('${A}','${SB}','v2:form:K1');`));
  // 웹훅(서버 키, RLS 우회)은 토큰으로 찾은 B로 넣는다
  const ins = must(`insert into public.crm_submissions (user_id, form_source_id, dedupe_key) values ('${B}','${SB}','v2:form:K1')
                    on conflict (user_id, form_source_id, dedupe_key) where dedupe_key is not null do nothing returning 'won'`);
  assert.equal(ins, "won");
  // B가 두 번째로 같은 키 → 중복(행 0)
  const dup = must(`insert into public.crm_submissions (user_id, form_source_id, dedupe_key) values ('${B}','${SB}','v2:form:K1')
                    on conflict (user_id, form_source_id, dedupe_key) where dedupe_key is not null do nothing returning 'won'`);
  assert.equal(dup, "");
});

test("RLS: A가 B 명의 행을 쓰려 하면 거절, A에게 B 행은 안 보임", { skip: SKIP }, () => {
  const r = sql(asUser(A, `insert into public.crm_submissions (user_id, form_source_id, dedupe_key) values ('${B}','${SB}','v2:form:K2');`));
  assert.equal(r.ok, false);
  assert.match(r.err, /row-level security/);
  assert.equal(must(asUser(A, `select count(*) from public.crm_submissions where user_id='${B}';`)), "0");
});

test("같은 회원·같은 source·같은 키: 독립 연결 2개 동시 → 정확히 1행, 하나만 선점", { skip: SKIP }, async () => {
  const q = `begin;
    insert into public.crm_submissions (user_id, form_source_id, dedupe_key) values ('${A}','${SA}','v2:sheet:CONC')
      on conflict (user_id, form_source_id, dedupe_key) where dedupe_key is not null do nothing returning 'won';
    select pg_sleep(1.5);
    commit;`;
  const [x, y] = await Promise.all([sqlAsync(q), sqlAsync(q)]);
  assert.ok(x.ok && y.ok, x.err + y.err);
  const wins = [x.out, y.out].filter((o) => o.split("\n").includes("won")).length;
  assert.equal(wins, 1);
  assert.equal(must("select count(*) from public.crm_submissions where dedupe_key='v2:sheet:CONC'"), "1");
});

test("같은 키·다른 source → 2행, 구버전 NULL 키는 반복 허용", { skip: SKIP }, () => {
  must(`insert into public.crm_submissions (user_id, form_source_id, dedupe_key) values ('${A}','${SA}','v2:form:K3'), ('${B}','${SB}','v2:form:K3')`);
  assert.equal(must("select count(*) from public.crm_submissions where dedupe_key='v2:form:K3'"), "2");
  must(`insert into public.crm_submissions (user_id, form_source_id) values ('${A}','${SA}'), ('${A}','${SA}'), ('${A}','${SA}')`);
  assert.ok(Number(must(`select count(*) from public.crm_submissions where user_id='${A}' and form_source_id='${SA}' and dedupe_key is null`)) >= 4);
});

test("같은 회원·서로 다른 폼·같은 키 → 2행 모두 선점(회원 고정)", { skip: SKIP }, () => {
  const q = (src) => `insert into public.crm_submissions (user_id, form_source_id, dedupe_key) values ('${A}','${src}','v2:form:K4')
    on conflict (user_id, form_source_id, dedupe_key) where dedupe_key is not null do nothing returning 'won'`;
  assert.equal(must(q(SA)), "won");
  assert.equal(must(q(SA2)), "won");
  assert.equal(must(`select count(*)||':'||count(distinct form_source_id)||':'||count(distinct user_id) from public.crm_submissions where dedupe_key='v2:form:K4'`), "2:2:1");
  assert.equal(must(q(SA)), ""); // 같은 폼에 다시 → 중복
});
