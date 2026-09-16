-- "수집된 게시글 후보 리스트에서 원하는 글을 ON/OFF 해서 예약포스팅에 쓰고 싶다"는 사용자
-- 요청(2026-09-16)으로, 어제(2026-09-15, 0011) 삭제했던 "후보함에서 골라 예약 발행" 개념을
-- 되살린다. 다만 이번엔 무작위 선택이 아니라 회원이 직접 ON으로 켜둔 후보를 먼저 켠 순서
-- (created_at asc, FIFO)대로 소비하고, 카테고리 필터는 0012에서 이미 추가한
-- ncafe_scheduled_sources.category_ids(복수)를 그대로 재사용한다(별도 필터 컬럼을 새로 만들지
-- 않음 — 비어있으면 전체, 있으면 그 카테고리들 중에서만 고른다).
alter table public.ncafe_candidates
  add column if not exists use_for_schedule boolean not null default false;

alter table public.ncafe_scheduled_sources
  drop constraint if exists ncafe_scheduled_sources_source_type_check;
alter table public.ncafe_scheduled_sources
  add constraint ncafe_scheduled_sources_source_type_check
  check (source_type = any (array['http', 'rss', 'perplexity', 'candidate_pool']));
