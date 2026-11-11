-- 관리자 회원 목록용: 전 회원의 저장 정책 + 사용량을 한 번에 (주인님 2026-11-11 「사용자별로 전체사용량 현재 사용량/만료기간 등을 표시」)
create or replace function public.member_storage_overview()
returns table (user_id uuid, quota_bytes bigint, retention_days integer, unlimited_retention boolean, source text,
               plan_name text, plan_expires_at timestamptz, override_until timestamptz, used_bytes bigint, measured_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, pol.quota_bytes, pol.retention_days, pol.unlimited_retention, pol.source, pol.plan_name,
         pol.plan_expires_at, pol.override_until, coalesce(u.bytes, 0), u.measured_at
  from public.profiles p
  cross join lateral public.member_storage_policy(p.id) pol
  left join public.member_storage_usage u on u.user_id = p.id;
$$;
revoke all on function public.member_storage_overview() from public, anon, authenticated;
grant execute on function public.member_storage_overview() to service_role;
select count(*) from public.member_storage_overview();
