-- 2026-10-23 마케팅 병합 A: 롱테일 키워드분석 → 키워드·경쟁사 분석 자동화(competitor-analysis v1.08).
-- 롱테일 표는 그대로 두고 이 앱이 읽고 쓴다. 회원 생성 자료(실행 기록·연관·롱테일 키워드)는 30일 뒤 매시간 정리한다.
-- 씨드 키워드(키워드 정의)는 경쟁사 키워드처럼 지우지 않는다. 계정·키·텔레그램 연결·다른 프로그램 표는 대상 아님.
--
-- 경쟁사 표와 달리 「30일 지난 행 읽기 차단」(restrictive select) 정책은 넣지 않는다: 연관·롱테일 키워드는
-- (seed_id, keyword) upsert로 다시 만들어지는데, 아직 정리되지 않은 지난 행과 겹치면 upsert가 RLS에 막힌다.
-- 화면은 created_at/executed_at 30일 필터로 숨기고(앱 코드), 물리 삭제는 아래 정리 작업이 매시간 한다.

create index if not exists longtail_runs_executed_retention_idx on public.longtail_runs(executed_at);
create index if not exists longtail_related_created_retention_idx on public.longtail_related_keywords(created_at);
create index if not exists longtail_expansions_created_retention_idx on public.longtail_expansions(created_at);

create function public.cleanup_longtail_generated_data() returns jsonb
language plpgsql set search_path = '' as $$
declare
  cutoff timestamptz := now() - interval '30 days';
  runs_count bigint; expansions_count bigint; related_count bigint;
begin
  delete from public.longtail_runs where executed_at <= cutoff;
  get diagnostics runs_count = row_count;
  delete from public.longtail_expansions where created_at <= cutoff;
  get diagnostics expansions_count = row_count;
  delete from public.longtail_related_keywords where created_at <= cutoff;
  get diagnostics related_count = row_count;
  return jsonb_build_object('runs', runs_count, 'expansions', expansions_count, 'related', related_count);
end;
$$;
revoke all on function public.cleanup_longtail_generated_data() from public, anon, authenticated, service_role;

-- UTC 매시 09분(경쟁사 정리 07분과 겹치지 않게).
select cron.schedule('longtail-generated-data-retention-30d', '9 * * * *',
  'select public.cleanup_longtail_generated_data();');
