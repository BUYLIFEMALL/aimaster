-- 저장 요금제에 「포스팅된 콘텐츠 보관 기간」을 따로 둠 + 포스팅 기록 + 새 요금제 값 (2026-11-11 주인님 지시)
-- 「유료결제자 (라이트 1G/1만원 생성콘텐츠 30일보관/포스팅된 콘텐츠 90일 보관) (스탠다드 3G/2만원 생성콘텐츠 60일보관/포스팅된 콘텐츠 180일 보관)
--   (프로 5G /3만원 생성콘텐츠 180일보관/포스팅 1년보관)」
-- 「관리자 페이지에서 요금제별 용량과 사용기간을 수정할수 있는 기능을 확장해서 넣어줘 상황에 따라 관리자에서 조정할수 있도록」
-- 결정(같은 날): 저장공간만 파는 추가 상품 / 포스팅 표시를 아직 안 붙인 프로그램의 파일은 「포스팅된 것」으로 보고 길게 보관 / 등급 혜택 없앰
-- 플랜: docs/PLAN_20261111_MEMBER_STORAGE_QUOTA.md §11
begin;

-- 1. 요금제: retention_days = 생성 콘텐츠 보관, posted_retention_days = 포스팅된 콘텐츠 보관 (둘 다 null = 자동 삭제 없음)
alter table public.storage_plans add column if not exists posted_retention_days integer;
update public.storage_plans set posted_retention_days = retention_days where posted_retention_days is null;

update public.storage_plans set name = '기본',     quota_bytes = 524288000,  retention_days = 30,  posted_retention_days = 30,  price_monthly = 0,     updated_at = now() where slug = 'free';
update public.storage_plans set name = '라이트',   quota_bytes = 1073741824, retention_days = 30,  posted_retention_days = 90,  price_monthly = 10000, updated_at = now() where slug = 'lite';
update public.storage_plans set name = '스탠다드', quota_bytes = 3221225472, retention_days = 60,  posted_retention_days = 180, price_monthly = 20000, updated_at = now() where slug = 'standard';
update public.storage_plans set name = '프로',     quota_bytes = 5368709120, retention_days = 180, posted_retention_days = 365, price_monthly = 30000, updated_at = now() where slug = 'pro';

-- 결제 요금제(「저장공간 추가」) 이름·금액 동기화
update public.pricing_plans pp set
  name = sp.name || ' ' || (sp.quota_bytes / 1073741824)::text || 'GB',
  price = sp.price_monthly
from public.storage_plans sp, public.programs p
where pp.storage_plan_slug = sp.slug and pp.program_id = p.id and p.slug = 'storage-plus' and sp.slug in ('lite', 'standard', 'pro');

-- 2. 등급 혜택 없앰(저장공간은 저장 구독을 결제해야 늘어남)
update public.member_grades set storage_plan_slug = null where storage_plan_slug is not null;

-- 3. 포스팅 기록: 프로그램이 발행에 성공하면 그 파일을 「포스팅됨」으로 남김(공용 컴포넌트 lib/storage/markPosted.ts)
create table if not exists public.member_posted_assets (
  bucket_id text not null,
  object_name text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_slug text,
  post_url text,
  posted_at timestamptz not null default now(),
  primary key (bucket_id, object_name)
);
create index if not exists member_posted_assets_user on public.member_posted_assets (user_id);
alter table public.member_posted_assets enable row level security;
drop policy if exists member_posted_assets_own on public.member_posted_assets;
create policy member_posted_assets_own on public.member_posted_assets for select using (auth.uid() = user_id);

-- 포스팅 표시를 붙인 버킷 목록. 여기 없는 버킷의 파일은 포스팅 여부를 모르므로 「포스팅됨」으로 보고 길게 보관한다(주인님 결정).
create table if not exists public.storage_posting_tracked_buckets (
  bucket_id text primary key,
  program_slug text,
  since timestamptz not null default now()
);
alter table public.storage_posting_tracked_buckets enable row level security;

create or replace function public.member_mark_posted(p_user uuid, p_bucket text, p_names text[], p_program text default null, p_url text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into public.member_posted_assets (bucket_id, object_name, user_id, program_slug, post_url)
  select p_bucket, x, p_user, p_program, p_url from unnest(p_names) x where x is not null and x <> ''
  on conflict (bucket_id, object_name) do update set posted_at = least(public.member_posted_assets.posted_at, excluded.posted_at),
    post_url = coalesce(excluded.post_url, public.member_posted_assets.post_url);
  get diagnostics n = row_count;
  if p_program is not null then
    insert into public.storage_posting_tracked_buckets (bucket_id, program_slug) values (p_bucket, p_program) on conflict (bucket_id) do nothing;
  end if;
  return n;
end $$;
revoke all on function public.member_mark_posted(uuid, text, text[], text, text) from public, anon, authenticated;
grant execute on function public.member_mark_posted(uuid, text, text[], text, text) to service_role;

-- 4. 회원별 정책: 포스팅 보관 기간을 함께 돌려줌 (반환 칸이 늘어 다시 만듦)
drop function if exists public.member_storage_policy(uuid);
create function public.member_storage_policy(uid uuid)
returns table (quota_bytes bigint, retention_days integer, unlimited_retention boolean, source text,
               plan_slug text, plan_name text, plan_expires_at timestamptz, override_until timestamptz,
               posted_retention_days integer, posted_unlimited boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  pr record;
  q bigint; d integer; pd integer; ps text; pn text; src text; sub_exp timestamptz := null;
  gq bigint; gd integer; gpd integer; gs text; gn text;
begin
  select * into pr from public.profiles where id = uid;
  if not found then return; end if;
  if pr.retention_exempt_manual then
    return query select null::bigint, null::integer, true, 'exempt'::text, null::text, '관리자·시험 계정'::text, null::timestamptz, null::timestamptz, null::integer, true;
    return;
  end if;
  select sp.quota_bytes, sp.retention_days, sp.posted_retention_days, sp.slug, sp.name into q, d, pd, ps, pn from public.storage_plans sp where sp.slug = 'free';
  src := 'free';
  select sp.quota_bytes, sp.retention_days, sp.posted_retention_days, sp.slug, sp.name, s.expires_at into gq, gd, gpd, gs, gn, sub_exp
  from public.subscriptions s
  join public.pricing_plans pp on pp.id = s.pricing_plan_id
  join public.storage_plans sp on sp.slug = pp.storage_plan_slug
  where s.user_id = uid and s.status = 'active'
    and (s.expires_at is null or s.expires_at > now() - interval '7 days')
  order by sp.quota_bytes desc limit 1;
  if found then q := gq; d := gd; pd := gpd; ps := gs; pn := gn; src := 'subscription'; else sub_exp := null; end if;
  select sp.quota_bytes, sp.retention_days, sp.posted_retention_days, sp.slug, sp.name into gq, gd, gpd, gs, gn
  from public.member_grades mg join public.storage_plans sp on sp.slug = mg.storage_plan_slug
  where mg.id = pr.grade_id;
  if found and gq > q then q := gq; d := gd; pd := gpd; ps := gs; pn := gn; src := 'grade'; sub_exp := null; end if;
  -- 관리자 지정: 보관 기간 지정은 생성·포스팅 둘 다에 적용(포스팅이 더 길면 포스팅은 그대로)
  if (pr.storage_override_until is null or pr.storage_override_until > now())
     and (pr.storage_quota_override_bytes is not null or pr.storage_retention_override_days is not null or pr.storage_retention_override_unlimited) then
    q := coalesce(pr.storage_quota_override_bytes, q);
    if pr.storage_retention_override_unlimited then d := null; pd := null;
    elsif pr.storage_retention_override_days is not null then
      d := pr.storage_retention_override_days;
      if pd is not null and pd < d then pd := d; end if;
    end if;
    return query select q, d, d is null, 'admin'::text, ps, pn, sub_exp, pr.storage_override_until, pd, pd is null;
    return;
  end if;
  return query select q, d, d is null, src, ps, pn, sub_exp, null::timestamptz, pd, pd is null;
end $$;
revoke all on function public.member_storage_policy(uuid) from public, anon, authenticated;
grant execute on function public.member_storage_policy(uuid) to service_role;

-- 5. 열외 다시 계산: 생성·포스팅 중 하나라도 30일보다 길면 프로그램 30일 정리에서 빠지고 중앙 정리가 맡음
create or replace function public.member_storage_refresh_exempt(uid uuid default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  with calc as (
    select p.id,
      (p.retention_exempt_manual
        or coalesce(pol.unlimited_retention, false) or coalesce(pol.posted_unlimited, false)
        or coalesce(pol.retention_days, 30) > 30 or coalesce(pol.posted_retention_days, 30) > 30) as want
    from public.profiles p
    left join lateral public.member_storage_policy(p.id) pol on true
    where uid is null or p.id = uid
  )
  update public.profiles p set retention_exempt = c.want from calc c
  where p.id = c.id and p.retention_exempt is distinct from c.want;
  get diagnostics n = row_count;
  return n;
end $$;

-- 6. 중앙 정리 대상: 연장 회원(수동 열외 제외)의 파일 중
--    포스팅된 파일(기록 있음, 또는 포스팅 표시를 아직 안 붙인 버킷) → 포스팅 보관 기간, 그 밖 → 생성 보관 기간이 지난 것
create or replace function public.member_storage_expired_files(max_rows integer default 500)
returns table (bucket_id text, name text, user_id uuid)
language sql stable security definer set search_path = '' as $$
  with ext as (
    select p.id, pol.retention_days as gen_days, pol.posted_retention_days as post_days
    from public.profiles p cross join lateral public.member_storage_policy(p.id) pol
    where p.retention_exempt and not p.retention_exempt_manual
      and (pol.retention_days is not null or pol.posted_retention_days is not null)
  ), cand as (
    select o.bucket_id, o.name, e.id as uid, o.created_at,
      case when exists (select 1 from public.member_posted_assets m where m.bucket_id = o.bucket_id and m.object_name = o.name)
             or not exists (select 1 from public.storage_posting_tracked_buckets t where t.bucket_id = o.bucket_id)
           then e.post_days else e.gen_days end as days
    from ext e join storage.objects o on o.name like '%' || e.id::text || '%'
  )
  select c.bucket_id, c.name, c.uid from cand c
  where c.days is not null and c.created_at < now() - make_interval(days => c.days)
  limit max_rows;
$$;
revoke all on function public.member_storage_expired_files(integer) from public, anon, authenticated;
grant execute on function public.member_storage_expired_files(integer) to service_role;

commit;

select public.member_storage_refresh_exempt();
