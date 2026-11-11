-- 회원별 저장공간(용량)·보관 기간 — 일반 30일·1GB, 저장 구독·등급·관리자 지정으로 연장
-- 주인님 지시 2026-11-11: 「일반사용자 | 기본 30일저장후 자동삭제 / 포스팅되었어도 동일하게 적용」「유료사용자 | 구독모델에 따라 저장기간/자동삭제 안되고 저장할수 있는 기간 늘려주기」
--   「각 사용자들이 본인들이 사용하고 있는 용량과 사용용량을 어떤 프로그램에서든 볼수 있게」「기본은 자동으로 처리되게 해놓고 관리자페이지에서 수동으로 사용자별로 용량과 보관기간을 늘릴수 있도록」
-- 플랜: docs/PLAN_20261111_MEMBER_STORAGE_QUOTA.md
-- 핵심: 약 40개 프로그램이 읽는 profiles.retention_exempt 를 「관리자·시험 수동 열외 OR 보관 연장 회원」으로 매일 다시 계산 → 프로그램 코드 수정 없이 연장 회원 자료가 30일에 지워지지 않음.
--       연장 기간(90일·1년)을 넘긴 파일은 메인 사이트 중앙 정리(/api/cron/storage-retention)가 지운다.
begin;

-- 1. 저장 요금제 (free = 일반 기본값, 관리자 화면에서 숫자 수정)
create table if not exists public.storage_plans (
  slug text primary key,
  name text not null,
  quota_bytes bigint not null,
  retention_days integer,                 -- null = 구독 중 자동 삭제 없음
  price_monthly integer not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.storage_plans enable row level security;
drop policy if exists storage_plans_read on public.storage_plans;
create policy storage_plans_read on public.storage_plans for select using (true);
insert into public.storage_plans (slug, name, quota_bytes, retention_days, price_monthly, sort_order) values
  ('free',     '기본',       1073741824,    30,     0, 0),
  ('lite',     '라이트',     10737418240,   90,  3900, 1),
  ('standard', '스탠다드',   53687091200,  365,  9900, 2),
  ('pro',      '프로',       214748364800, null, 19900, 3)
on conflict (slug) do nothing;

-- 2. 결제 연결: 요금제 ↔ 저장 요금제, 등급 기본 혜택
alter table public.pricing_plans add column if not exists storage_plan_slug text references public.storage_plans(slug);
alter table public.member_grades add column if not exists storage_plan_slug text references public.storage_plans(slug);
update public.member_grades set storage_plan_slug = 'standard' where slug = 'premium' and storage_plan_slug is null;

-- 「저장공간 추가」 결제용 프로그램(카탈로그 비공개) + 월 요금제 3종
insert into public.programs (name, slug, short_desc, is_active, sort_order, badges, version, premium_autochecked, vip_autochecked)
select '저장공간 추가', 'storage-plus', '내 자료 저장 용량과 보관 기간을 늘리는 구독', false, 9999, '{}'::text[], 'v1.01', true, true
where not exists (select 1 from public.programs where slug = 'storage-plus');
insert into public.pricing_plans (program_id, name, billing_type, price, is_active, sort_order, storage_plan_slug)
select p.id, sp.name || ' ' || (sp.quota_bytes / 1073741824)::text || 'GB', 'monthly', sp.price_monthly, true, sp.sort_order, sp.slug
from public.programs p cross join public.storage_plans sp
where p.slug = 'storage-plus' and sp.slug <> 'free'
  and not exists (select 1 from public.pricing_plans x where x.program_id = p.id and x.storage_plan_slug = sp.slug);

-- 3. 관리자 수동 지정 칸 + 수동 열외 분리
alter table public.profiles add column if not exists retention_exempt_manual boolean not null default false;
alter table public.profiles add column if not exists storage_quota_override_bytes bigint;        -- null = 자동
alter table public.profiles add column if not exists storage_retention_override_days integer;    -- null = 자동
alter table public.profiles add column if not exists storage_retention_override_unlimited boolean not null default false;
alter table public.profiles add column if not exists storage_override_until timestamptz;         -- null = 기한 없음
alter table public.profiles add column if not exists storage_override_note text;
update public.profiles set retention_exempt_manual = true where retention_exempt = true and retention_exempt_manual = false;

-- 회원이 직접 바꾸지 못하게(기존 보호 함수 확장)
create or replace function public.profiles_protect_retention_exempt() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.retention_exempt := false;
      new.retention_exempt_manual := false;
      new.storage_quota_override_bytes := null;
      new.storage_retention_override_days := null;
      new.storage_retention_override_unlimited := false;
      new.storage_override_until := null;
      new.storage_override_note := null;
    elsif new.retention_exempt is distinct from old.retention_exempt
       or new.retention_exempt_manual is distinct from old.retention_exempt_manual
       or new.storage_quota_override_bytes is distinct from old.storage_quota_override_bytes
       or new.storage_retention_override_days is distinct from old.storage_retention_override_days
       or new.storage_retention_override_unlimited is distinct from old.storage_retention_override_unlimited
       or new.storage_override_until is distinct from old.storage_override_until
       or new.storage_override_note is distinct from old.storage_override_note then
      raise exception 'storage/retention settings cannot be changed by members';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect_retention_exempt on public.profiles;
create trigger profiles_protect_retention_exempt before insert or update on public.profiles
  for each row execute function public.profiles_protect_retention_exempt();

-- 4. 회원별 정책: 수동 열외 → 관리자 지정 → 저장 구독(만료 7일 유예) → 등급 혜택 → 기본
create or replace function public.member_storage_policy(uid uuid)
returns table (quota_bytes bigint, retention_days integer, unlimited_retention boolean, source text,
               plan_slug text, plan_name text, plan_expires_at timestamptz, override_until timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  pr record;
  q bigint; d integer; ps text; pn text; src text; sub_exp timestamptz := null;
  gq bigint; gd integer; gs text; gn text;
begin
  select * into pr from public.profiles where id = uid;
  if not found then return; end if;
  if pr.retention_exempt_manual then
    return query select null::bigint, null::integer, true, 'exempt'::text, null::text, '관리자·시험 계정'::text, null::timestamptz, null::timestamptz;
    return;
  end if;
  -- 기본
  select sp.quota_bytes, sp.retention_days, sp.slug, sp.name into q, d, ps, pn from public.storage_plans sp where sp.slug = 'free';
  src := 'free';
  -- 저장 구독(가장 큰 용량, 만료 뒤 7일 유예)
  select sp.quota_bytes, sp.retention_days, sp.slug, sp.name, s.expires_at into gq, gd, gs, gn, sub_exp
  from public.subscriptions s
  join public.pricing_plans pp on pp.id = s.pricing_plan_id
  join public.storage_plans sp on sp.slug = pp.storage_plan_slug
  where s.user_id = uid and s.status = 'active'
    and (s.expires_at is null or s.expires_at > now() - interval '7 days')
  order by sp.quota_bytes desc limit 1;
  if found then q := gq; d := gd; ps := gs; pn := gn; src := 'subscription'; else sub_exp := null; end if;
  -- 등급 혜택이 더 크면 그쪽
  select sp.quota_bytes, sp.retention_days, sp.slug, sp.name into gq, gd, gs, gn
  from public.member_grades mg join public.storage_plans sp on sp.slug = mg.storage_plan_slug
  where mg.id = pr.grade_id;
  if found and gq > q then q := gq; d := gd; ps := gs; pn := gn; src := 'grade'; sub_exp := null; end if;
  -- 관리자 지정(기한 안이면 칸별로 덮어씀)
  if (pr.storage_override_until is null or pr.storage_override_until > now())
     and (pr.storage_quota_override_bytes is not null or pr.storage_retention_override_days is not null or pr.storage_retention_override_unlimited) then
    q := coalesce(pr.storage_quota_override_bytes, q);
    if pr.storage_retention_override_unlimited then d := null;
    elsif pr.storage_retention_override_days is not null then d := pr.storage_retention_override_days; end if;
    return query select q, d, d is null, 'admin'::text, ps, pn, sub_exp, pr.storage_override_until;
    return;
  end if;
  return query select q, d, d is null, src, ps, pn, sub_exp, null::timestamptz;
end $$;
revoke all on function public.member_storage_policy(uuid) from public, anon, authenticated;
grant execute on function public.member_storage_policy(uuid) to service_role;

-- 5. 사용량(파일 경로 안의 회원 번호로 합산, 실측 90% 이상)
create table if not exists public.member_storage_usage (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  bytes bigint not null default 0,
  file_count integer not null default 0,
  by_bucket jsonb not null default '{}'::jsonb,
  measured_at timestamptz not null default now()
);
alter table public.member_storage_usage enable row level security;
drop policy if exists member_storage_usage_own on public.member_storage_usage;
create policy member_storage_usage_own on public.member_storage_usage for select using (auth.uid() = user_id);

create or replace function public.member_storage_measure(uid uuid default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  with obj as (
    select o.bucket_id, coalesce(nullif(o.metadata->>'size', '')::bigint, 0) as sz,
      (select p.id from regexp_matches(o.name, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'g') m
         join public.profiles p on p.id::text = m[1] limit 1) as owner_id
    from storage.objects o
    where uid is null or o.name like '%' || uid::text || '%'
  ), per_bucket as (
    select owner_id, bucket_id, sum(sz) as b, count(*) as c from obj where owner_id is not null group by 1, 2
  ), per_user as (
    select owner_id, sum(b)::bigint as bytes, sum(c)::integer as cnt, jsonb_object_agg(bucket_id, b) as bb from per_bucket group by 1
  )
  insert into public.member_storage_usage (user_id, bytes, file_count, by_bucket, measured_at)
  select owner_id, bytes, cnt, bb, now() from per_user
  on conflict (user_id) do update set bytes = excluded.bytes, file_count = excluded.file_count, by_bucket = excluded.by_bucket, measured_at = now();
  get diagnostics n = row_count;
  -- 파일이 하나도 없게 된 회원은 0으로
  if uid is null then
    update public.member_storage_usage u set bytes = 0, file_count = 0, by_bucket = '{}'::jsonb, measured_at = now()
    where u.measured_at < now() - interval '1 minute';
  elsif n = 0 then
    insert into public.member_storage_usage (user_id) values (uid)
    on conflict (user_id) do update set bytes = 0, file_count = 0, by_bucket = '{}'::jsonb, measured_at = now();
  end if;
  return n;
end $$;
revoke all on function public.member_storage_measure(uuid) from public, anon, authenticated;
grant execute on function public.member_storage_measure(uuid) to service_role;

-- 6. 열외 다시 계산: 수동 열외 OR 보관이 30일보다 긴 회원(무기한 포함) → 프로그램 30일 정리에서 빠짐
create or replace function public.member_storage_refresh_exempt(uid uuid default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  with calc as (
    select p.id, p.retention_exempt as cur,
      (p.retention_exempt_manual or coalesce(pol.unlimited_retention, false) or coalesce(pol.retention_days, 30) > 30) as want
    from public.profiles p
    left join lateral public.member_storage_policy(p.id) pol on true
    where uid is null or p.id = uid
  )
  update public.profiles p set retention_exempt = c.want from calc c
  where p.id = c.id and p.retention_exempt is distinct from c.want;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.member_storage_refresh_exempt(uuid) from public, anon, authenticated;
grant execute on function public.member_storage_refresh_exempt(uuid) to service_role;

-- 7. 연장 기간을 넘긴 파일 목록(중앙 정리용, 무기한·수동 열외는 제외)
create or replace function public.member_storage_expired_files(max_rows integer default 500)
returns table (bucket_id text, name text, user_id uuid)
language sql stable security definer set search_path = '' as $$
  with ext as (
    select p.id, pol.retention_days
    from public.profiles p cross join lateral public.member_storage_policy(p.id) pol
    where p.retention_exempt and not p.retention_exempt_manual
      and pol.retention_days is not null and pol.retention_days > 30
  )
  select o.bucket_id, o.name, e.id
  from ext e join storage.objects o on o.name like '%' || e.id::text || '%'
  where o.created_at < now() - make_interval(days => e.retention_days)
  limit max_rows;
$$;
revoke all on function public.member_storage_expired_files(integer) from public, anon, authenticated;
grant execute on function public.member_storage_expired_files(integer) to service_role;

-- 8. 매일 한국 시각 04:10(UTC 19:10) 열외 다시 계산 + 사용량 측정
select cron.unschedule('member-storage-daily') where exists (select 1 from cron.job where jobname = 'member-storage-daily');
select cron.schedule('member-storage-daily', '10 19 * * *', $$select public.member_storage_refresh_exempt(); select public.member_storage_measure();$$);

commit;

-- 첫 계산
select public.member_storage_refresh_exempt();
select public.member_storage_measure();
