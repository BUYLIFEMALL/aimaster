-- 상세페이지 이미지 생성 시 매 섹션 프롬프트에 공통으로 덧붙일 사용자 추가 지시사항.
alter table public.shop_products
  add column image_generation_notes text;
