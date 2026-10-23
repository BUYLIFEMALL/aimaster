-- 대표이미지(source_image_url, 이미지 생성 시 합성 기준)와 별개로,
-- AI 분석 정확도를 높이기 위한 참고 이미지(최대 10장)를 추가로 받는다.
alter table public.shop_products
  add column reference_image_urls text[] not null default '{}';
