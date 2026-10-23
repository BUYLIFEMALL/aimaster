-- 경쟁사 키워드 분석 자동화. Make.com 시나리오
-- "00@🟣경쟁사 키워드분석-SERP-💰.blueprint.json"(Airtable 베이스 appzAYWz0W0j3xEZY)를
-- AIMaster 서브프로젝트로 이식하며 멀티테넌시에 맞게 재설계했다. 설계 배경은
-- docs/ARCHITECTURE.md 참고.

create table public.competitor_keywords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,
  location text not null default 'South Korea',
  google_domain text not null default 'google.com',
  lang text not null default 'ko',
  is_active boolean not null default true, -- 향후 정기 모니터링(cron) 대상 여부
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index competitor_keywords_user_id_idx on public.competitor_keywords(user_id);

create table public.competitor_serp_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword_id uuid not null references public.competitor_keywords(id) on delete cascade,
  total_results bigint,
  location text,
  google_domain text,
  lang text,
  serp_search_id text, -- SerpApi search_metadata.id
  executed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index competitor_serp_jobs_user_id_idx on public.competitor_serp_jobs(user_id);
create index competitor_serp_jobs_keyword_id_idx on public.competitor_serp_jobs(keyword_id);

create table public.competitor_serp_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.competitor_serp_jobs(id) on delete cascade,
  position int,
  result_type text not null check (result_type in ('organic', 'ad', 'paa', 'local')),
  title text,
  link text,
  snippet text,
  domain text,
  created_at timestamptz not null default now()
);

create index competitor_serp_results_user_id_idx on public.competitor_serp_results(user_id);
create index competitor_serp_results_job_id_idx on public.competitor_serp_results(job_id);
create index competitor_serp_results_domain_idx on public.competitor_serp_results(domain);

-- 도메인 -> 회사정보는 사용자와 무관한 객관적 사실이라 전역으로 공유한다(user_id 없음).
-- 여러 회원이 같은 도메인(예: 쿠팡, 네이버)을 조회해도 Perplexity/GPT 리서치를 한 번만 하면 된다.
create table public.competitor_profiles (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  company_name text,
  summary text, -- Perplexity 리서치 원문
  researched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- "이 도메인을 내 경쟁사로 표시" — 원본 Airtable의 경쟁사 테이블 중 개인화가 필요한 부분만 분리.
create table public.user_tracked_competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, domain)
);

create index user_tracked_competitors_user_id_idx on public.user_tracked_competitors(user_id);

create table public.competitor_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword_id uuid not null references public.competitor_keywords(id) on delete cascade,
  job_id uuid not null references public.competitor_serp_jobs(id) on delete cascade,
  summary_text text, -- GPT-4o 분석(경쟁사/USP/콘텐츠 아이디어)
  html_report text, -- Claude로 재가공한 HTML 리포트(선택, 버튼을 눌렀을 때만 생성)
  created_at timestamptz not null default now()
);

create index competitor_analyses_user_id_idx on public.competitor_analyses(user_id);
create index competitor_analyses_keyword_id_idx on public.competitor_analyses(keyword_id);

create trigger competitor_keywords_set_updated_at
  before update on public.competitor_keywords
  for each row execute function public.set_updated_at();

alter table public.competitor_keywords enable row level security;
alter table public.competitor_serp_jobs enable row level security;
alter table public.competitor_serp_results enable row level security;
alter table public.competitor_profiles enable row level security;
alter table public.user_tracked_competitors enable row level security;
alter table public.competitor_analyses enable row level security;

create policy "competitor_keywords_owner_select" on public.competitor_keywords for select using (auth.uid() = user_id);
create policy "competitor_keywords_owner_insert" on public.competitor_keywords for insert with check (auth.uid() = user_id);
create policy "competitor_keywords_owner_update" on public.competitor_keywords for update using (auth.uid() = user_id);
create policy "competitor_keywords_owner_delete" on public.competitor_keywords for delete using (auth.uid() = user_id);

create policy "competitor_serp_jobs_owner_select" on public.competitor_serp_jobs for select using (auth.uid() = user_id);
create policy "competitor_serp_jobs_owner_insert" on public.competitor_serp_jobs for insert with check (auth.uid() = user_id);
create policy "competitor_serp_jobs_owner_delete" on public.competitor_serp_jobs for delete using (auth.uid() = user_id);

create policy "competitor_serp_results_owner_select" on public.competitor_serp_results for select using (auth.uid() = user_id);
create policy "competitor_serp_results_owner_insert" on public.competitor_serp_results for insert with check (auth.uid() = user_id);
create policy "competitor_serp_results_owner_delete" on public.competitor_serp_results for delete using (auth.uid() = user_id);

-- 전역 공유 캐시: 읽기는 로그인 사용자 전체 허용, 쓰기(리서치 결과 저장/갱신)도 로그인 사용자면
-- 가능하게 한다(서버 액션이 인증된 사용자 세션으로 upsert). 관리자 전용으로 좁히지 않는 이유는
-- 이 값이 "누구 소유"의 데이터가 아니라 리서치 시점에 누구든 처음 채워 넣을 수 있는 공용 사실이기 때문.
create policy "competitor_profiles_authenticated_select" on public.competitor_profiles for select using (auth.role() = 'authenticated');
create policy "competitor_profiles_authenticated_insert" on public.competitor_profiles for insert with check (auth.role() = 'authenticated');
create policy "competitor_profiles_authenticated_update" on public.competitor_profiles for update using (auth.role() = 'authenticated');

create policy "user_tracked_competitors_owner_select" on public.user_tracked_competitors for select using (auth.uid() = user_id);
create policy "user_tracked_competitors_owner_insert" on public.user_tracked_competitors for insert with check (auth.uid() = user_id);
create policy "user_tracked_competitors_owner_delete" on public.user_tracked_competitors for delete using (auth.uid() = user_id);

create policy "competitor_analyses_owner_select" on public.competitor_analyses for select using (auth.uid() = user_id);
create policy "competitor_analyses_owner_insert" on public.competitor_analyses for insert with check (auth.uid() = user_id);
create policy "competitor_analyses_owner_update" on public.competitor_analyses for update using (auth.uid() = user_id);
create policy "competitor_analyses_owner_delete" on public.competitor_analyses for delete using (auth.uid() = user_id);
