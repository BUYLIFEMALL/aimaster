-- W01-A1 격리 계약 시험용 최소 기초 자료 (2026-11-18, CC-SNS-01).
-- ★ 로컬 Docker 격리 DB(qa_aif_a1_*) 전용. 운영·공용 DB에 실행하지 않는다.
-- 이것은 Supabase·중앙 저장 정책의 "모양만 흉내 낸 대역(stub)"이다. 이 위에서 통과한 시험은
-- 우리 migration의 계약(제약·권한·잠금·상태 전이)을 확인할 뿐, 실제 중앙 함수·실제 Supabase와의 통합 통과가 아니다.
--
-- 원문과의 차이
--  * public.profiles: 원문은 여러 열이 있으나 여기서는 id·retention_exempt·retention_exempt_manual만.
--  * public.member_storage_usage: 원문(supabase/migrations/0063) 표 정의 그대로(RLS 정책 제외).
--  * public.member_storage_policy(uid): 원문(0068)과 **반환 열 모양만 같고** 본문은 qa_quota 표에서 quota만 읽는다
--    (원문은 subscriptions·pricing_plans·storage_plans·member_grades·profiles 열에 의존).
--  * storage.objects: Supabase 실물이 아니라 id·bucket_id·name·metadata·created_at만 있는 표.
--  * auth.uid(): 세션 설정 request.jwt.claim.sub를 읽는 대역.
--  * 역할 anon·authenticated·service_role은 컨테이너에 이미 있다(없으면 만든다). 로그인 불가 역할, set role로만 쓴다.

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;

create schema if not exists auth;
create schema if not exists storage;
grant usage on schema public, auth, storage to anon, authenticated, service_role;

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;

create table public.profiles (
  id uuid primary key,
  retention_exempt boolean not null default false,
  retention_exempt_manual boolean not null default false
);

create table public.member_storage_usage (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  bytes bigint not null default 0,
  file_count integer not null default 0,
  by_bucket jsonb not null default '{}'::jsonb,
  measured_at timestamptz not null default now()
);

create table public.qa_quota (user_id uuid primary key, quota_bytes bigint);   -- null = 무제한

create function public.member_storage_policy(uid uuid)
returns table (quota_bytes bigint, retention_days integer, unlimited_retention boolean, source text,
               plan_slug text, plan_name text, plan_expires_at timestamptz, override_until timestamptz,
               posted_retention_days integer, posted_unlimited boolean)
language sql stable security definer set search_path = '' as $$
  select q.quota_bytes, 30, false, 'qa-stub'::text, 'free'::text, 'qa'::text, null::timestamptz, null::timestamptz, 30, false
  from public.qa_quota q where q.user_id = uid
$$;
revoke all on function public.member_storage_policy(uuid) from public, anon, authenticated;
grant execute on function public.member_storage_policy(uuid) to service_role;

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  name text not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  unique (bucket_id, name)
);
