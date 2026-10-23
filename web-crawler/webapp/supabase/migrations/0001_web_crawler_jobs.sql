-- 웹 크롤링 자동화 - 초기 스키마
--
-- 주의: 이 마이그레이션은 이미 다른 에이전트(DB 설정 단계)가 Supabase MCP를 통해 라이브
-- 프로젝트에 직접 적용했습니다. 이 파일은 AIMaster 루트 CLAUDE.md의 "서브프로젝트 작업물은
-- 반드시 해당 서브프로젝트 폴더 안에서 관리한다" 원칙에 따라, 실제 적용된 스키마를 이
-- 서브프로젝트 폴더 안에도 문서/이력으로 남겨두기 위한 것입니다 — 다시 실행할 필요는 없습니다.

create table public.web_crawler_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  target_fields text[] not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  result_url text,
  row_count integer,
  error_message text,
  pii_warning boolean,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index web_crawler_jobs_user_id_idx on public.web_crawler_jobs(user_id);

alter table public.web_crawler_jobs enable row level security;

-- 조회/등록은 사용자 본인만 가능하다(owner-only). 상태 갱신(pending → running → completed/failed)은
-- 이 Next.js 앱이 아니라 별도의 Python 크롤링 서비스가 service role(RLS 우회)로 직접 수행하므로,
-- update 정책은 두지 않는다 — 이 앱은 초기 행을 insert하고 이후에는 읽기만 한다.
create policy "web_crawler_jobs_select_own" on public.web_crawler_jobs for select using (auth.uid() = user_id);
create policy "web_crawler_jobs_insert_own" on public.web_crawler_jobs for insert with check (auth.uid() = user_id);

-- user_api_keys는 AIMaster 전체가 공유하는 테이블이라, 이 프로젝트는 기존 provider
-- ('openai'/'anthropic'/'gemini'/'perplexity')를 그대로 재사용한다(새 provider 추가 없음 —
-- 셀렉터 추출용 AI 키 하나만 필요하되, 회원이 이미 등록해둔 4종 중 아무거나 고를 수 있게 한다).
