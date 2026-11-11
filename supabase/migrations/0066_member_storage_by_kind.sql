-- 저장공간 사용량을 종류별(이미지·영상·음악·기타 파일)로도 합산 (2026-11-11 주인님 「영상 / 기타파일 도 표시해야지」)
-- member_storage_usage.by_kind = {"image":바이트,"video":…,"audio":…,"other":…}. 분류 기준은 파일 형식(metadata.mimetype).
begin;

alter table public.member_storage_usage add column if not exists by_kind jsonb not null default '{}'::jsonb;

create or replace function public.storage_kind_of(mimetype text) returns text
language sql immutable set search_path = '' as $$
  select case
    when mimetype like 'image/%' then 'image'
    when mimetype like 'video/%' then 'video'
    when mimetype like 'audio/%' then 'audio'
    else 'other' end;
$$;

create or replace function public.member_storage_measure(uid uuid default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if uid is not null then
    with obj as (
      select o.bucket_id, public.storage_kind_of(o.metadata->>'mimetype') as kind,
             coalesce(nullif(o.metadata->>'size', '')::bigint, 0) as sz
      from storage.objects o
      where o.name like '%' || uid::text || '%'
    ), pb as (select bucket_id, sum(sz) as b, count(*) as c from obj group by 1),
       pk as (select kind, sum(sz) as b from obj group by 1)
    insert into public.member_storage_usage (user_id, bytes, file_count, by_bucket, by_kind, measured_at)
    select uid,
           coalesce((select sum(b) from pb), 0)::bigint,
           coalesce((select sum(c) from pb), 0)::integer,
           coalesce((select jsonb_object_agg(bucket_id, b) from pb), '{}'::jsonb),
           coalesce((select jsonb_object_agg(kind, b) from pk), '{}'::jsonb),
           now()
    on conflict (user_id) do update set bytes = excluded.bytes, file_count = excluded.file_count,
      by_bucket = excluded.by_bucket, by_kind = excluded.by_kind, measured_at = now();
    return 1;
  end if;

  with obj as (
    select o.bucket_id, public.storage_kind_of(o.metadata->>'mimetype') as kind,
      coalesce(nullif(o.metadata->>'size', '')::bigint, 0) as sz,
      (select p.id from regexp_matches(o.name, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'g') m
         join public.profiles p on p.id::text = m[1] limit 1) as owner_id
    from storage.objects o
  ), mine as (select * from obj where owner_id is not null),
     pb as (select owner_id, bucket_id, sum(sz) as b, count(*) as c from mine group by 1, 2),
     pk as (select owner_id, kind, sum(sz) as b from mine group by 1, 2),
     pu as (
       select owner_id, sum(b)::bigint as bytes, sum(c)::integer as cnt, jsonb_object_agg(bucket_id, b) as bb from pb group by 1
     )
  insert into public.member_storage_usage (user_id, bytes, file_count, by_bucket, by_kind, measured_at)
  select pu.owner_id, pu.bytes, pu.cnt, pu.bb,
         coalesce((select jsonb_object_agg(kind, b) from pk where pk.owner_id = pu.owner_id), '{}'::jsonb), now()
  from pu
  on conflict (user_id) do update set bytes = excluded.bytes, file_count = excluded.file_count,
    by_bucket = excluded.by_bucket, by_kind = excluded.by_kind, measured_at = now();
  get diagnostics n = row_count;
  update public.member_storage_usage u set bytes = 0, file_count = 0, by_bucket = '{}'::jsonb, by_kind = '{}'::jsonb, measured_at = now()
  where u.measured_at < now() - interval '1 minute';
  return n;
end $$;
revoke all on function public.member_storage_measure(uuid) from public, anon, authenticated;
grant execute on function public.member_storage_measure(uuid) to service_role;

commit;

-- 기존 사용량에 종류별 값 채우기
select public.member_storage_measure();
