-- 0077 (2026-11-19, [역할: mall-builder] claude-win-20261025-workspace CC-B2B-BACK-01, Master msg_b549fb254462 · B2B-20261119-MALL-STORAGE)
-- 상태: 로컬 후보 — 운영 미적용. 운영 적용은 Master 승인·실행. 0076(정리 후보 제외)과는 별개이며 0076을 바꾸지 않는다.
-- 무엇: 회원 용량 측정 member_storage_measure가 쇼핑몰 파일을 「몰 대표」 용량으로 센다.
--   쇼핑몰 4버킷(mall-builder-public·private·proposals·applied)의 경로는 <몰 id>/… 로 시작한다.
--   지금(0066)은 이름 속 회원 UUID로만 귀속해서 ① 몰 사진·공급사 사진·제안·적용 사진은 아무에게도 안 잡히고
--   ② 사업자등록증·리셀러/공급사 신청 서류(private, <몰>/<회원>/…)는 손님·신청자 용량으로 잡힌다.
-- 결정(2026-11-19 주인님 「추천대로 진행해」): 4버킷 모두 몰 대표(mall_builder_stores.owner_id) 귀속 — 공급사 사진·손님 서류·제안 포함.
--   용량을 넘어도 업로드는 막지 않는다(이 파일은 측정만 바꾸고 member_storage_check·업로드 경로는 건드리지 않음).
-- 규칙(한 곳): public.member_storage_object_owner(버킷, 이름)
--   쇼핑몰 4버킷 → 첫 폴더가 UUID 형식이고 그 몰이 있으면 몰 대표, 아니면 귀속 없음
--   그 밖의 mall-builder-* 버킷 → 귀속 없음(새 쇼핑몰 버킷은 규칙을 정한 뒤 추가)
--   나머지 버킷 → 0066과 같은 「이름 속 첫 번째 회원 UUID」
-- 한 명 측정과 전체 측정이 같은 규칙 함수를 쓰므로 결과가 같다(0066에서는 한 명 측정이 「이름에 uid가 어디든 들어 있으면」이라
--   이름에 회원 UUID가 둘 이상인 드문 파일에서 전체 측정과 달랐다 — 이제 전체 측정 기준으로 맞춤).
-- 권한: 두 함수 모두 service_role만 실행(0066과 같음).
-- 되돌리기(두 단계로 분리): ① 정의·권한만 — 0066 파일에서 member_storage_measure의 create or replace … end $$; 와
--   revoke/grant 두 줄만 실행 + drop function public.member_storage_object_owner(text, text). 0066 파일 끝의
--   「select public.member_storage_measure();」(전체 측정, 운영 쓰기)는 함께 실행하지 않는다. ② 재측정은 필요할 때 따로.
-- 적용 뒤 값 갱신: 이 파일은 전체 측정을 바로 돌리지 않는다(운영 쓰기 최소화). 매일 member-storage-daily 예약(0063)이나
--   위젯의 오래된 값 재측정이 새 규칙으로 채운다. 바로 채우려면 Master가 select public.member_storage_measure(); 를 따로 실행.
begin;

do $$
begin
  if to_regclass('public.mall_builder_stores') is null then
    raise exception '0077: public.mall_builder_stores 표가 없습니다 — 쇼핑몰 DB가 있는 곳에만 적용';
  end if;
end $$;

create or replace function public.member_storage_object_owner(p_bucket text, p_name text) returns uuid
language sql stable security definer set search_path = '' as $$
  select case
    when p_bucket in ('mall-builder-public', 'mall-builder-private', 'mall-builder-proposals', 'mall-builder-applied') then
      (select st.owner_id
         from public.mall_builder_stores st
         join public.profiles p on p.id = st.owner_id
        where st.id = case when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                           then split_part(p_name, '/', 1)::uuid end)
    when p_bucket like 'mall-builder-%' then null
    else
      (select p.id from regexp_matches(p_name, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'g') m
         join public.profiles p on p.id::text = m[1] limit 1)
  end;
$$;
revoke all on function public.member_storage_object_owner(text, text) from public, anon, authenticated;
grant execute on function public.member_storage_object_owner(text, text) to service_role;

-- 측정 본체는 규칙 함수를 파일마다 부르지 않고 집합(조인)으로 같은 규칙을 계산한다(성능 — 규칙 함수는 기준·시험·한 건 확인용).
--   쇼핑몰: 쇼핑몰 4버킷만 골라(bucket_id는 색인 앞 열) 몰 표와 첫 폴더 글자로 조인 → 몰 대표. 나머지: 0066과 같은 인라인 「이름 속 첫 회원」.
-- 동시성: ① 사용량 쓰기(on conflict)는 이미 더 새 측정(measured_at이 더 늦은 값)이 있으면 덮어쓰지 않는다
--   ② 전체 측정 끝의 0 처리는 「이번 측정 트랜잭션 시작(now()) 전에 잰 행」만 — 이번에 쓴 행(= now())과
--   나중에 시작한 동시 한 명 측정 행(> now())은 그대로. 0066의 「1분」 조건 때문에 마지막 몰을 넘긴 옛 대표 값이 남던 문제를 막는다.
create or replace function public.member_storage_measure(uid uuid default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if uid is not null then
    with obj as (
      select o.bucket_id, public.storage_kind_of(o.metadata->>'mimetype') as kind,
             coalesce(nullif(o.metadata->>'size', '')::bigint, 0) as sz
      from storage.objects o
      where o.bucket_id not like 'mall-builder-%' and o.name like '%' || uid::text || '%'
        and (select p.id from regexp_matches(o.name, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'g') m
               join public.profiles p on p.id::text = m[1] limit 1) = uid
      union all
      select o.bucket_id, public.storage_kind_of(o.metadata->>'mimetype'),
             coalesce(nullif(o.metadata->>'size', '')::bigint, 0)
      from public.mall_builder_stores st
      join storage.objects o on o.bucket_id in ('mall-builder-public', 'mall-builder-private', 'mall-builder-proposals', 'mall-builder-applied')
                            and split_part(o.name, '/', 1) = st.id::text
      where st.owner_id = uid and exists (select 1 from public.profiles p where p.id = uid)
    ), pb as (select bucket_id, sum(sz) as b, count(*) as c from obj group by 1),
       pk as (select kind, sum(sz) as b from obj group by 1)
    insert into public.member_storage_usage as u (user_id, bytes, file_count, by_bucket, by_kind, measured_at)
    select uid,
           coalesce((select sum(b) from pb), 0)::bigint,
           coalesce((select sum(c) from pb), 0)::integer,
           coalesce((select jsonb_object_agg(bucket_id, b) from pb), '{}'::jsonb),
           coalesce((select jsonb_object_agg(kind, b) from pk), '{}'::jsonb),
           now()
    on conflict (user_id) do update set bytes = excluded.bytes, file_count = excluded.file_count,
      by_bucket = excluded.by_bucket, by_kind = excluded.by_kind, measured_at = excluded.measured_at
      where u.measured_at <= excluded.measured_at;
    return 1;
  end if;

  with obj as (
    select o.bucket_id, public.storage_kind_of(o.metadata->>'mimetype') as kind,
      coalesce(nullif(o.metadata->>'size', '')::bigint, 0) as sz,
      (select p.id from regexp_matches(o.name, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'g') m
         join public.profiles p on p.id::text = m[1] limit 1) as owner_id
    from storage.objects o
    where o.bucket_id not like 'mall-builder-%'
    union all
    select o.bucket_id, public.storage_kind_of(o.metadata->>'mimetype'),
      coalesce(nullif(o.metadata->>'size', '')::bigint, 0), st.owner_id
    from storage.objects o
    join public.mall_builder_stores st on st.id::text = split_part(o.name, '/', 1)
    join public.profiles p on p.id = st.owner_id
    where o.bucket_id in ('mall-builder-public', 'mall-builder-private', 'mall-builder-proposals', 'mall-builder-applied')
  ), mine as (select * from obj where owner_id is not null),
     pb as (select owner_id, bucket_id, sum(sz) as b, count(*) as c from mine group by 1, 2),
     pk as (select owner_id, kind, sum(sz) as b from mine group by 1, 2),
     pu as (
       select owner_id, sum(b)::bigint as bytes, sum(c)::integer as cnt, jsonb_object_agg(bucket_id, b) as bb from pb group by 1
     )
  insert into public.member_storage_usage as u (user_id, bytes, file_count, by_bucket, by_kind, measured_at)
  select pu.owner_id, pu.bytes, pu.cnt, pu.bb,
         coalesce((select jsonb_object_agg(kind, b) from pk where pk.owner_id = pu.owner_id), '{}'::jsonb), now()
  from pu
  on conflict (user_id) do update set bytes = excluded.bytes, file_count = excluded.file_count,
    by_bucket = excluded.by_bucket, by_kind = excluded.by_kind, measured_at = excluded.measured_at
    where u.measured_at <= excluded.measured_at;
  get diagnostics n = row_count;
  update public.member_storage_usage u set bytes = 0, file_count = 0, by_bucket = '{}'::jsonb, by_kind = '{}'::jsonb, measured_at = now()
  where u.measured_at < now();
  return n;
end $$;
revoke all on function public.member_storage_measure(uuid) from public, anon, authenticated;
grant execute on function public.member_storage_measure(uuid) to service_role;

commit;
