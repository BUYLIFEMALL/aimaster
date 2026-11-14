-- AI 쇼핑몰 빌더 — 쇼핑몰 사진 30일 규칙(안 쓰는 사진만) (2026-11-14)
-- 주인님 결정(2026-11-14): 「관리자/테스트계정을 제외하고는 30일 룰 적용」 → 선택 「안 쓰는 사진만 30일」,
--   「사용자들은 필요하다면 플랜을 업그레이드하거나 추가 용량 구매해서 사용하게 하면 되」.
-- 지울 후보 = 몰 공개 저장소(mall-builder-public)의 <몰 id>/… 파일 중
--   ① 어디에도 안 쓰임(상품 사진·상세 그림·상품 설명·첫 화면 초안/게시본·지난 주문 품목 사진·공지 — 0022 「쓰는 중」과 같은 기준)
--   ② 몰 주인의 보관 기간이 지남(메인 사이트 member_storage_policy: 기본 30일, 저장 구독이면 그 기간, 무기한이면 제외)
--   ③ 몰 주인이 관리자·시험 계정(profiles.retention_exempt_manual)이 아님
-- 실제 삭제는 서버 키를 가진 메인 사이트 중앙 정리(/api/cron/storage-retention)가 이 목록을 받아 저장소 API로 지운다(쇼핑몰 앱에는 서버 키가 없음).
-- Lab DB에는 메인 사이트 보관 규칙 함수·칸이 없으므로, 있을 때만 쓰고 없으면 30일·열외 없음으로 본다.

create or replace function public.mall_builder_expired_photos(p_max integer default 500)
returns table (bucket_id text, name text, user_id uuid)
language plpgsql stable security definer set search_path = '' as $$
declare
  s record;
  refs text;
  v_days integer;
  v_unlimited boolean;
  v_manual boolean;
  v_left integer := least(greatest(coalesce(p_max, 500), 1), 2000);
  v_n integer;
  v_has_policy boolean := to_regprocedure('public.member_storage_policy(uuid)') is not null;
  v_has_manual boolean := exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = 'profiles' and c.column_name = 'retention_exempt_manual');
begin
  for s in select st.id, st.owner_id from public.mall_builder_stores st order by st.created_at loop
    exit when v_left <= 0;
    v_manual := false; v_unlimited := false; v_days := 30;
    if v_has_manual then
      execute 'select coalesce(p.retention_exempt_manual, false) from public.profiles p where p.id = $1' into v_manual using s.owner_id;
    end if;
    continue when coalesce(v_manual, false);
    if v_has_policy then
      execute 'select coalesce(x.unlimited_retention, false), x.retention_days from public.member_storage_policy($1) x' into v_unlimited, v_days using s.owner_id;
    end if;
    continue when coalesce(v_unlimited, false);
    v_days := coalesce(v_days, 30);

    select coalesce(string_agg(x.t, ' '), '') into refs
    from (
      select p.images::text || ' ' || p.detail_images::text || ' ' || p.description as t from public.mall_builder_products p where p.store_id = s.id
      union all
      select coalesce(g.draft_blocks::text, '') || ' ' || coalesce(g.published_blocks::text, '') from public.mall_builder_pages g where g.store_id = s.id
      union all
      select oi.image_url from public.mall_builder_order_items oi join public.mall_builder_orders o on o.id = oi.order_id
        where o.store_id = s.id and oi.image_url is not null
      union all
      select n.body from public.mall_builder_notices n where n.store_id = s.id
      union all
      select coalesce(st.settings::text, '') || ' ' || coalesce(st.business_info::text, '') from public.mall_builder_stores st where st.id = s.id
    ) x;

    return query
      select o.bucket_id::text, o.name, s.owner_id
      from storage.objects o
      where o.bucket_id = 'mall-builder-public'
        and (storage.foldername(o.name))[1] = s.id::text
        and o.created_at < now() - make_interval(days => v_days)
        and strpos(refs, o.name) = 0
      order by o.created_at
      limit v_left;
    get diagnostics v_n = row_count;
    v_left := v_left - v_n;
  end loop;
end;
$$;

revoke all on function public.mall_builder_expired_photos(integer) from public, anon, authenticated;
grant execute on function public.mall_builder_expired_photos(integer) to service_role;

-- 기존 버그 수정: 관리자 「사진」 화면 쓰임 확인(0022)이 몰 로고(stores.settings.app_logo)를 보지 않아 로고가 「지울 수 있음」으로 나왔다
create or replace function pg_temp.swap(src text, a text, b text, what text) returns text language plpgsql as $f$
begin
  if (char_length(src) - char_length(replace(src, a, ''))) / char_length(a) <> 1 then raise exception '문구를 1번 찾지 못함: %', what; end if;
  return replace(src, a, b);
end $f$;
do $m$
declare src text;
begin
  src := pg_get_functiondef('public.mall_builder_store_files(uuid)'::regprocedure);
  src := pg_temp.swap(src, 'select n.body from public.mall_builder_notices n where n.store_id = p_store',
    'select n.body from public.mall_builder_notices n where n.store_id = p_store' || chr(10)
    || '    union all' || chr(10)
    || '    select coalesce(st.settings::text, '''') from public.mall_builder_stores st where st.id = p_store', '사진 쓰임 — 로고');
  execute src;
end $m$;
