// T0 운영 묶음 로컬 검사(2026-11-12) — 운영 DB에 넣기 전에 로컬 Docker Postgres(aww-pg-test)의 빈 시험 DB에서 묶음 전체를 돌려 본다.
// · Supabase 흉내 틀: 역할(anon·authenticated·service_role), auth.users/uid()/jwt(), storage.buckets/objects/foldername(), profiles(is_admin),
//   extensions 스키마(pgcrypto) + http 확장 대신 같은 이름의 타입·함수(로컬 Postgres에는 http 확장이 없음).
// · 묶음의 마지막 commit을 rollback으로 바꿔 실행 → 문법·참조 오류가 있으면 여기서 먼저 걸린다. 적용 뒤 개수(표·함수·규칙·버킷)를 같은 트랜잭션 안에서 센다.
// 쓰는 법: node scripts/check-prod-bundle-local.mjs   (먼저 node scripts/build-prod-bundle.mjs)
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const CONTAINER = "aww-pg-test";
const DB = "mb_bundle_check";
const bundlePath = fileURLToPath(new URL("../supabase/prod-bundle/T0_prod_bundle.sql", import.meta.url));
let bundle = readFileSync(bundlePath, "utf8");
const httpLine = "create extension if not exists http with schema extensions;";
if (!bundle.includes(httpLine)) throw new Error("http 확장 줄을 찾지 못했습니다.");
bundle = bundle.replace(httpLine, "-- (로컬 검사: http 확장은 흉내 틀로 대신)");
const lastCommit = bundle.lastIndexOf("\ncommit;");
if (lastCommit < 0) throw new Error("마지막 commit을 찾지 못했습니다.");
const count = `
select 'mall_builder 표' 항목, count(*)::text 값 from information_schema.tables where table_schema='public' and table_name like 'mall\\_builder\\_%'
union all select 'mall_builder 함수', count(*)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'mall\\_builder\\_%'
union all select '저장소 규칙', count(*)::text from pg_policies where schemaname='storage' and policyname like 'mall\\_builder%'
union all select '버킷', count(*)::text from storage.buckets where id like 'mall-builder%';
`;
bundle = bundle.slice(0, lastCommit) + "\n" + count + "\nrollback;\n";

const stub = `
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
create function auth.jwt() returns jsonb language sql stable as $f$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $f$;
create function auth.role() returns text language sql stable as $f$ select current_setting('request.jwt.claim.role', true) $f$;
create schema storage;
create table storage.buckets (id text primary key, name text not null, owner uuid, public boolean default false, file_size_limit bigint, allowed_mime_types text[], created_at timestamptz default now(), updated_at timestamptz default now());
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid, owner_id text, metadata jsonb, created_at timestamptz default now(), updated_at timestamptz default now(), last_accessed_at timestamptz default now());
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $f$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $f$;
create table public.profiles (id uuid primary key references auth.users(id), email text, is_admin boolean default false);
create schema extensions;
create extension pgcrypto with schema extensions;
create type extensions.http_header as (field varchar, value varchar);
create type extensions.http_request as (method varchar, uri varchar, headers extensions.http_header[], content_type varchar, content varchar);
create type extensions.http_response as (status integer, content_type varchar, headers extensions.http_header[], content varchar);
create function extensions.http_header(field varchar, value varchar) returns extensions.http_header language sql as $f$ select row(field, value)::extensions.http_header $f$;
create function extensions.http(request extensions.http_request) returns extensions.http_response language sql as $f$ select row(0, null, null, null)::extensions.http_response $f$;
create function extensions.http_set_curlopt(curlopt varchar, value varchar) returns boolean language sql as $f$ select true $f$;
create function extensions.http_reset_curlopt() returns boolean language sql as $f$ select true $f$;
grant usage on schema auth, storage, extensions to anon, authenticated, service_role;
`;

const psql = (db, file) => {
  try {
    return execFileSync("docker", ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1", "-q", "-f", "-"], { input: readFileSync(file), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    throw new Error((e.stderr || e.message).toString().slice(0, 3000));
  }
};
const dir = mkdtempSync(join(tmpdir(), "mb-check-"));
const w = (name, text) => { const p = join(dir, name); writeFileSync(p, text); return p; };

execFileSync("docker", ["exec", CONTAINER, "psql", "-U", "postgres", "-q", "-c", `drop database if exists ${DB}`]);
execFileSync("docker", ["exec", CONTAINER, "psql", "-U", "postgres", "-q", "-c", `create database ${DB}`]);
try {
  psql(DB, w("stub.sql", stub));
  const out = psql(DB, w("bundle.sql", bundle));
  console.log("✔ 묶음 전체가 오류 없이 실행됐습니다(rollback으로 되돌림).");
  console.log(out.trim());
} catch (e) {
  console.error("✖ 묶음 실행 오류:\n" + e.message);
  process.exitCode = 1;
} finally {
  execFileSync("docker", ["exec", CONTAINER, "psql", "-U", "postgres", "-q", "-c", `drop database if exists ${DB}`]);
}
