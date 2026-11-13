-- 2026-11-13 주인님 결정(원본 사진 참고 수집 플랜 결정 4): 상품 원본 사진의 출처 표시 칸.
-- 'collected' = 상품소싱 확장이 다른 판매자 상품 페이지에서 수집한 참고 사진(trending-product-finder/docs/PLAN_20261113_REFERENCE_PHOTO_COLLECT.md).
-- 'member' 또는 비어 있음 = 회원이 직접 올린 사진(기존 줄은 모두 비어 있어 동작 변화 없음).
-- 11번가·스마트스토어 등록기는 대표로 쓸 사진이 collected이고 합성 대표사진(main_image_url)이 없으면 등록 직전 경고 창을 띄우고, 등록 여부는 회원이 고른다(막지 않음, 결정 3).
alter table public.shop_products add column if not exists source_image_origin text;
alter table public.shop_products drop constraint if exists shop_products_source_image_origin_check;
alter table public.shop_products add constraint shop_products_source_image_origin_check
  check (source_image_origin is null or source_image_origin in ('member', 'collected'));
-- 되돌리기: alter table public.shop_products drop constraint if exists shop_products_source_image_origin_check; alter table public.shop_products drop column if exists source_image_origin;
