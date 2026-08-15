-- /products/new에서 상품을 저장할 때 이미지 생성 모델(나노바나나2/나노바나나 프로)을
-- 미리 선택해두고, /products/[id]의 섹션 이미지 생성 단계에서 그 선택을 기본값으로
-- 이어받기 위한 컬럼. 기본값은 나노바나나 프로.
alter table public.shop_products
  add column default_image_model text not null default 'nanobananaPro'
    check (default_image_model in ('nanobanana2', 'nanobananaPro'));
