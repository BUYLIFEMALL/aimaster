-- 메이커 P2(2026-11-13, 주인님 승인): 상품 「대표사진」 칸 — 바나나 「🛍 상품 대표사진 합성」 결과를 원본 사진과 따로 보관한다.
-- source_image_url(원본·AI 분석 입력)과 reference_image_urls(참고 사진)는 그대로 두고, 등록기는 main_image_url ?? source_image_url 순서로 대표사진을 쓴다.
-- 파일은 <회원id>/products/<상품id>/main/ 아래라 30일 정리(cleanup-generated)가 상품과 함께 지운다. 기존 줄은 값이 비어 있어 동작 변화 없음.
alter table public.shop_products add column if not exists main_image_url text;
alter table public.shop_products add column if not exists main_image_urls text[] not null default '{}';
