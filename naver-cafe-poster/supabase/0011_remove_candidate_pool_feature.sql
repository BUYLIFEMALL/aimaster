-- "🎲 후보함(랜덤 선택)" 예약 소스 기능을 폐기한다(사용자 지시, 2026-09-15 — 불필요한
-- 기능이라 삭제 요청). 후보를 재활용해 예약 게시하는 대신, HTTP/RSS/Perplexity 세 방식으로만
-- 예약 자동화를 지원하는 이전 상태로 되돌린다. 실사용 데이터가 없어(candidate_pool 타입
-- 소스 0건, use_for_schedule=true인 후보 0건) 안전하게 되돌릴 수 있었다.
alter table public.ncafe_scheduled_sources
  drop constraint if exists ncafe_scheduled_sources_source_type_check;

alter table public.ncafe_scheduled_sources
  add constraint ncafe_scheduled_sources_source_type_check
  check (source_type in ('http', 'rss', 'perplexity'));

alter table public.ncafe_candidates
  drop column if exists use_for_schedule;
