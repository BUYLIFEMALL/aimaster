-- D7 안 쓰는 사진 정리 — 몰 사진 목록 + 쓰임 여부(Lab DB rjjtjakljjxsgjelqgek)
-- 저장소(mall-builder-public)는 공개 버킷이라 읽기 규칙이 없다 → 파일 목록은 이 함수로만 본다(그 몰 운영자만)
-- 「쓰는 중」 = 사진 경로가 상품 사진·상품 설명·첫 화면 초안/게시본(글 블록 포함)·지난 주문 품목 사진·공지 본문 어디에든 들어 있음
-- 「지울 수 있음」 = 쓰지 않음 + 올린 지 하루가 지남(편집 중 아직 저장하지 않은 사진 보호)
-- 지우기는 화면에서 저장소 지우기 규칙(mall_builder_public_delete, 그 몰 운영자)으로 하고, 지우기 직전에 이 함수로 다시 확인한다

create or replace function public.mall_builder_store_files(p_store uuid)
returns table (name text, size bigint, created_at timestamptz, in_use boolean, deletable boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  refs text;
begin
  if not public.mall_builder_is_store_staff(p_store) then
    raise exception '이 몰의 운영자만 볼 수 있습니다.';
  end if;

  select coalesce(string_agg(x.t, ' '), '') into refs
  from (
    select p.images::text || ' ' || p.description as t from public.mall_builder_products p where p.store_id = p_store
    union all
    select coalesce(g.draft_blocks::text, '') || ' ' || coalesce(g.published_blocks::text, '') from public.mall_builder_pages g where g.store_id = p_store
    union all
    select oi.image_url from public.mall_builder_order_items oi join public.mall_builder_orders o on o.id = oi.order_id
      where o.store_id = p_store and oi.image_url is not null
    union all
    select n.body from public.mall_builder_notices n where n.store_id = p_store
  ) x;

  return query
    select s.name,
           coalesce((s.metadata ->> 'size')::bigint, 0),
           s.created_at,
           strpos(refs, s.name) > 0,
           strpos(refs, s.name) = 0 and s.created_at < now() - interval '1 day'
    from storage.objects s
    where s.bucket_id = 'mall-builder-public' and (storage.foldername(s.name))[1] = p_store::text
    order by s.created_at desc;
end;
$$;

grant execute on function public.mall_builder_store_files(uuid) to authenticated;
