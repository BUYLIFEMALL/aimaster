-- 수집된 게시글 후보(ncafe_candidates)에 ON/OFF 토글을 추가해서, 예약 자동화가 이
-- 후보함에서 무작위로 하나를 골라 카페 게시글을 만들 수 있게 한다(사용자 지시, 2026-09-15).
alter table public.ncafe_candidates
  add column if not exists use_for_schedule boolean not null default false;

-- ncafe_scheduled_sources.source_type에 "candidate_pool"(후보함에서 랜덤 선택) 값을 추가로 허용한다.
alter table public.ncafe_scheduled_sources
  drop constraint if exists ncafe_scheduled_sources_source_type_check;

alter table public.ncafe_scheduled_sources
  add constraint ncafe_scheduled_sources_source_type_check
  check (source_type in ('http', 'rss', 'perplexity', 'candidate_pool'));
