-- AI 쇼핑몰 빌더 H2 — 상품 「상세 그림」(상세 설명 아래 세로로 이어 보이는 긴 사진들) (2026-11-13)
-- 설계 docs/PLAN_20261113_H2_PROSELL_PRODUCT_IMPORT.md §4~5. 프로셀 등 다른 쇼핑몰 상품의 상세 설명이 대부분 「긴 사진 여러 장」이라 옮겨 오려면 필요.
-- 모양은 사진 칸(images)과 같다: [{url, path}] — path는 이 몰 공개 폴더(<몰 id>/…). 상품당 최대 40장.
-- 추가·함수 일부 바꾸기만(drop 없음). 바꾸는 함수: 사진 쓰임 확인(0022)·손님 상품 읽기(0018)·분양 상품 담기·동기화(0062).

alter table public.mall_builder_products add column if not exists detail_images jsonb not null default '[]'::jsonb;
do $c$
begin
  if not exists (select 1 from pg_constraint where conname = 'mall_builder_products_detail_images_chk') then
    alter table public.mall_builder_products add constraint mall_builder_products_detail_images_chk
      check (jsonb_typeof(detail_images) = 'array' and jsonb_array_length(detail_images) <= 40);
  end if;
end $c$;

create or replace function pg_temp.swap(src text, a text, b text, what text) returns text language plpgsql as $f$
begin
  if (char_length(src) - char_length(replace(src, a, ''))) / char_length(a) <> 1 then raise exception '문구를 1번 찾지 못함: %', what; end if;
  return replace(src, a, b);
end $f$;

do $m$
declare src text;
begin
  -- 사진 쓰임 확인: 상세 그림에 쓰인 사진도 「쓰는 중」(안 쓰는 사진 지우기에서 빠지게)
  src := pg_get_functiondef('public.mall_builder_store_files(uuid)'::regprocedure);
  src := pg_temp.swap(src, 'select p.images::text || '' '' || p.description as t',
                           'select p.images::text || '' '' || p.detail_images::text || '' '' || p.description as t', '사진 쓰임');
  execute src;

  -- 손님 상품 읽기(가격 비공개 상품용 함수): 상세 그림도 함께
  src := pg_get_functiondef('public.mall_builder_shop_products(uuid,uuid[],text,integer)'::regprocedure);
  src := pg_temp.swap(src, '''images'', p.images,', '''images'', p.images, ''detail_images'', p.detail_images,', '손님 상품 읽기');
  execute src;

  -- 분양몰: 본사 상품을 담을 때 상세 그림도 복사
  src := pg_get_functiondef('public.mall_builder_resale_add(uuid,uuid[],numeric)'::regprocedure);
  src := pg_temp.swap(src, 'images, option_groups, shipping_policy_id, moq, order_unit, max_qty, source_product_id)',
                           'images, detail_images, option_groups, shipping_policy_id, moq, order_unit, max_qty, source_product_id)', '분양 담기 칸');
  src := pg_temp.swap(src, 'src.images, src.option_groups,', 'src.images, src.detail_images, src.option_groups,', '분양 담기 값');
  execute src;

  -- 분양몰: 본사가 상품을 고치면 상세 그림도 따라 바뀜
  src := pg_get_functiondef('public.mall_builder_products_resale_sync()'::regprocedure);
  src := pg_temp.swap(src, 'images = new.images,', 'images = new.images, detail_images = new.detail_images,', '분양 동기화');
  execute src;
end $m$;
