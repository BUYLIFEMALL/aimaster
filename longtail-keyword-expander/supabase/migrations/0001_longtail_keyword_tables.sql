-- 롱테일 키워드분석 자동화. Make.com 시나리오
-- "01🟣네이버 키워드분석-SERP-💰.blueprint.json"(Airtable 베이스 appWzz3bi7r4INt0G)를
-- AIMaster 서브프로젝트로 이식하며 멀티테넌시에 맞게 재설계했다. 설계 배경은
-- docs/ARCHITECTURE.md 참고.

create table public.longtail_seed_keywords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,
  engine text not null default 'naver' check (engine in ('google', 'naver')),
  is_active boolean not null default true, -- 향후 정기 모니터링(cron) 대상 여부
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index longtail_seed_keywords_user_id_idx on public.longtail_seed_keywords(user_id);

-- 원본 Airtable의 "Related Keyword" 테이블은 전역 유니크(다른 Seed끼리도 병합)였는데, 이는
-- 원본이 1인용이라 문제없던 것뿐이다. 멀티테넌시에서는 사용자별로도, 같은 사용자 안에서도
-- Seed별로 독립돼야 하므로 (seed_id, keyword) 단위로 스코프한다.
create table public.longtail_related_keywords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  seed_id uuid not null references public.longtail_seed_keywords(id) on delete cascade,
  keyword text not null,
  relevance_score numeric,
  source text not null default 'naver_search',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seed_id, keyword)
);

create index longtail_related_keywords_user_id_idx on public.longtail_related_keywords(user_id);
create index longtail_related_keywords_seed_id_idx on public.longtail_related_keywords(seed_id);

create table public.longtail_expansions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  seed_id uuid not null references public.longtail_seed_keywords(id) on delete cascade,
  related_id uuid references public.longtail_related_keywords(id) on delete cascade, -- null이면 Seed 키워드 직속 확장
  keyword text not null,
  created_at timestamptz not null default now(),
  unique (seed_id, keyword)
);

create index longtail_expansions_user_id_idx on public.longtail_expansions(user_id);
create index longtail_expansions_seed_id_idx on public.longtail_expansions(seed_id);
create index longtail_expansions_related_id_idx on public.longtail_expansions(related_id);

create table public.longtail_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  seed_id uuid not null references public.longtail_seed_keywords(id) on delete cascade,
  executed_at timestamptz not null default now(),
  related_count int not null default 0,
  expansion_count int not null default 0,
  summary_text text -- 블로그 담당자용 작업 지시 메시지(GPT-4o)
);

create index longtail_runs_user_id_idx on public.longtail_runs(user_id);
create index longtail_runs_seed_id_idx on public.longtail_runs(seed_id);

alter table public.longtail_seed_keywords enable row level security;
alter table public.longtail_related_keywords enable row level security;
alter table public.longtail_expansions enable row level security;
alter table public.longtail_runs enable row level security;

create policy "owner_all_longtail_seed_keywords" on public.longtail_seed_keywords
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all_longtail_related_keywords" on public.longtail_related_keywords
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all_longtail_expansions" on public.longtail_expansions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all_longtail_runs" on public.longtail_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_api_keys의 provider check 제약에 'openai'/'serpapi'는 competitor-analysis가 이미
-- 추가해뒀으므로(docs/PLATFORM_PATTERNS.md §14) 이 서브프로젝트에서 추가로 넓힐 제약은 없다.
