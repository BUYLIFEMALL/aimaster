-- 예약 자동화 등록 시 카테고리를 복수로 선택할 수 있게 한다(사용자 지시, 2026-09-15).
-- 이 소스가 생성하는 콘텐츠 자체에 카테고리를 붙이는 게 아니라(ncafe_posts는 카테고리
-- 개념이 없음), "이 예약 소스가 어떤 주제들을 다루는지" 등록·목록 화면에서 태그로 보여주는
-- 조직화용 메타데이터다. ncafe_categories 삭제 시 배열에서 자동으로 정리되지는 않으므로
-- (uuid[]는 FK on delete를 지원하지 않음) 화면에서 조회 시 존재하지 않는 id는 무시한다.
alter table public.ncafe_scheduled_sources
  add column if not exists category_ids uuid[] not null default '{}';
