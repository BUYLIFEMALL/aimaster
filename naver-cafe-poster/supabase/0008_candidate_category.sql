-- 게시글 후보(ncafe_candidates)에 회원이 수집 시 직접 정하는 자유 입력 카테고리를 추가한다.
-- "🎲 후보함(랜덤 선택)" 예약 소스가 특정 카테고리 안에서만 무작위로 골라 원하는 게시판에
-- 등록할 수 있도록 하기 위함이다(사용자 지시, 2026-09-15). 카테고리 필터 자체는 새 컬럼 없이
-- ncafe_scheduled_sources.source_input(candidate_pool 타입일 때 카테고리 값을 담음)을 재사용한다.
alter table public.ncafe_candidates
  add column if not exists category text not null default '';
