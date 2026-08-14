-- AI 분석이 채우는 마케팅용 "상품명"(name)과 별개로, 사용자가 직접 지정하는
-- 관리용/참고용 상품명. 최종 상세페이지 제작·파일명 등에서 이 값을 우선 참고한다.
alter table public.shop_products
  add column product_label text;
