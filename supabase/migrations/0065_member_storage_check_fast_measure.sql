-- 저장공간 2단계: 꽉 찼을 때 새 저장 막기 판정 + 회원 한 명 다시 계산 빠르게 (2026-11-11 주인님 「진행해」)
-- 플랜: docs/PLAN_20261111_MEMBER_STORAGE_QUOTA.md §4-4 · 0063/0064 다음 단계
begin;

-- 1. 회원 한 명 측정은 정규식으로 주인을 찾지 않고 바로 합산(전체 측정은 그대로)
create or replace function public.member_storage_measure(uid uuid default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if uid is not null then
    with per_bucket as (
      select o.bucket_id, sum(coalesce(nullif(o.metadata->>'size', '')::bigint, 0)) as b, count(*) as c
      from storage.objects o
      where o.name like '%' || uid::text || '%'
      group by o.bucket_id
    )
    insert into public.member_storage_usage (user_id, bytes, file_count, by_bucket, measured_at)
    select uid, coalesce(sum(b), 0)::bigint, coalesce(sum(c), 0)::integer,
           coalesce(jsonb_object_agg(bucket_id, b) filter (where bucket_id is not null), '{}'::jsonb), now()
    from per_bucket
    on conflict (user_id) do update set bytes = excluded.bytes, file_count = excluded.file_count, by_bucket = excluded.by_bucket, measured_at = now();
    return 1;
  end if;

  with obj as (
    select o.bucket_id, coalesce(nullif(o.metadata->>'size', '')::bigint, 0) as sz,
      (select p.id from regexp_matches(o.name, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'g') m
         join public.profiles p on p.id::text = m[1] limit 1) as owner_id
    from storage.objects o
  ), per_bucket as (
    select owner_id, bucket_id, sum(sz) as b, count(*) as c from obj where owner_id is not null group by 1, 2
  ), per_user as (
    select owner_id, sum(b)::bigint as bytes, sum(c)::integer as cnt, jsonb_object_agg(bucket_id, b) as bb from per_bucket group by 1
  )
  insert into public.member_storage_usage (user_id, bytes, file_count, by_bucket, measured_at)
  select owner_id, bytes, cnt, bb, now() from per_user
  on conflict (user_id) do update set bytes = excluded.bytes, file_count = excluded.file_count, by_bucket = excluded.by_bucket, measured_at = now();
  get diagnostics n = row_count;
  update public.member_storage_usage u set bytes = 0, file_count = 0, by_bucket = '{}'::jsonb, measured_at = now()
  where u.measured_at < now() - interval '1 minute';
  return n;
end $$;
revoke all on function public.member_storage_measure(uuid) from public, anon, authenticated;
grant execute on function public.member_storage_measure(uuid) to service_role;

-- 2. 저장해도 되는지 판정 — 프로그램이 생성 결과를 저장하기 전(유료 AI 호출 전) 서버 키로 부른다
create or replace function public.member_storage_check(uid uuid, add_bytes bigint default 0)
returns table (allowed boolean, used_bytes bigint, quota_bytes bigint, ratio numeric, message text, upgrade_url text)
language plpgsql security definer set search_path = '' as $$
declare
  q bigint; used bigint; measured timestamptz;
begin
  select pol.quota_bytes into q from public.member_storage_policy(uid) pol;
  select u.bytes, u.measured_at into used, measured from public.member_storage_usage u where u.user_id = uid;
  used := coalesce(used, 0);
  if q is null then
    return query select true, used, null::bigint, null::numeric, null::text, 'https://www.buylife.xyz/storage'::text;
    return;
  end if;
  -- 한도에 가깝고 측정이 오래됐으면 먼저 다시 센다
  if used >= q * 0.8 and (measured is null or measured < now() - interval '1 hour') then
    perform public.member_storage_measure(uid);
    select u.bytes into used from public.member_storage_usage u where u.user_id = uid;
    used := coalesce(used, 0);
  end if;
  return query select
    (used + greatest(add_bytes, 0)) <= q,
    used, q, round(used::numeric / q, 4),
    case when (used + greatest(add_bytes, 0)) <= q then null
         else '저장공간이 가득 찼습니다. 저장공간에서 용량을 늘리거나 오래된 자료를 정리한 뒤 다시 시도해 주세요.' end,
    'https://www.buylife.xyz/storage'::text;
end $$;
revoke all on function public.member_storage_check(uuid, bigint) from public, anon, authenticated;
grant execute on function public.member_storage_check(uuid, bigint) to service_role;

commit;
