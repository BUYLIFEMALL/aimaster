-- v1.79: 쇼핑제휴 상품 등록에 알리익스프레스·토스쇼핑 소스 종류 추가 (기존 데이터는 변경하지 않고 허용 값만 늘린다).
alter table public.tco_content_sources drop constraint if exists tco_content_sources_source_type_check;
alter table public.tco_content_sources add constraint tco_content_sources_source_type_check
  check (source_type in ('daily', 'youtube', 'blog', 'coupang', 'naver_brand_connect', 'aliexpress', 'toss'));
