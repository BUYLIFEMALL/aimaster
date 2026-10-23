-- CAPTCHA/WAF 통지-확인 UI + 도메인 프로필 캐시
--
-- 주의: 이 마이그레이션은 이미 Supabase MCP를 통해 라이브 프로젝트에 직접 적용했습니다.
-- 0001과 동일하게, 실제 적용된 스키마를 이 서브프로젝트 폴더 안에도 문서/이력으로 남겨두기
-- 위한 것입니다 — 다시 실행할 필요는 없습니다.

-- 1) web_crawler_jobs: CAPTCHA/WAF 감지 시 즉시 실패시키지 않고 "확인 대기" 상태로 멈춰서
--    사용자가 우회 시도 여부를 직접 고를 수 있게 한다. resume 시 다시 API 키를 물어보지
--    않도록(키 자체는 저장하지 않음) provider/model/max_rows를 job 행에 같이 저장해둔다.
alter table web_crawler_jobs
  drop constraint web_crawler_jobs_status_check,
  add constraint web_crawler_jobs_status_check
    check (status in ('pending', 'running', 'blocked', 'completed', 'failed'));

alter table web_crawler_jobs
  add column if not exists ai_provider text,
  add column if not exists ai_model text,
  add column if not exists max_rows integer;

-- 2) 도메인 프로필 캐시 — 같은 도메인+수집항목 조합으로 재수집할 때 LLM 셀렉터 추출을
--    다시 하지 않도록 재사용한다. CLI 도구의 파일 기반 fingerprints/profile.json과 같은
--    목적이지만, Render 컨테이너는 재배포마다 파일시스템이 초기화되므로 여기서는 반드시
--    Supabase 테이블로 둔다. 사용자 데이터가 아니라 도메인 구조에 대한 공유 캐시이므로
--    RLS는 켜되 정책은 두지 않는다(service role 전용).
create table if not exists web_crawler_domain_profiles (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  target_fields_key text not null,
  item_selector text not null,
  field_selectors jsonb not null,
  next_page_selector text,
  needs_dynamic boolean not null default false,
  fetch_method text not null default 'ladder_a',
  hit_count integer not null default 1,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (domain, target_fields_key)
);

alter table web_crawler_domain_profiles enable row level security;
