-- 카카오톡 정보 콘텐츠 자동화 - 초기 스키마
-- Supabase SQL Editor 또는 `supabase db push`로 실행하세요.
-- 이 프로젝트는 AIMaster와 같은 Supabase 프로젝트(esgxyikcnnvmlhygjkth)를 공유합니다.

-- 1. updated_at 자동 갱신 트리거 함수
-- 다른 서브프로젝트(threads/insta_auto_poster 등)에서 이미 만들어졌다면
-- create or replace라 안전하게 재실행됩니다.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. kakao_topics: 회원이 등록한 관심 주제/키워드
create table if not exists public.kakao_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_name text not null,
  keywords text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger kakao_topics_set_updated_at
  before update on public.kakao_topics
  for each row execute function public.set_updated_at();

create index if not exists kakao_topics_user_created_idx
  on public.kakao_topics (user_id, created_at desc);

alter table public.kakao_topics enable row level security;

create policy "kakao_topics_select_own"
  on public.kakao_topics for select
  using (auth.uid() = user_id);

create policy "kakao_topics_insert_own"
  on public.kakao_topics for insert
  with check (auth.uid() = user_id);

create policy "kakao_topics_update_own"
  on public.kakao_topics for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "kakao_topics_delete_own"
  on public.kakao_topics for delete
  using (auth.uid() = user_id);

-- 3. kakao_reports: 주제별로 AI가 생성한 정보 콘텐츠(제목/카카오 발송용 요약/웹 리포트 전체 본문)
create table if not exists public.kakao_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid not null references public.kakao_topics (id) on delete cascade,
  title text not null,
  summary text not null,
  content text not null,
  source_type text not null default 'perplexity' check (source_type in ('perplexity')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger kakao_reports_set_updated_at
  before update on public.kakao_reports
  for each row execute function public.set_updated_at();

create index if not exists kakao_reports_user_created_idx
  on public.kakao_reports (user_id, created_at desc);

create index if not exists kakao_reports_topic_idx
  on public.kakao_reports (topic_id);

alter table public.kakao_reports enable row level security;

create policy "kakao_reports_select_own"
  on public.kakao_reports for select
  using (auth.uid() = user_id);

create policy "kakao_reports_insert_own"
  on public.kakao_reports for insert
  with check (auth.uid() = user_id);

create policy "kakao_reports_update_own"
  on public.kakao_reports for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "kakao_reports_delete_own"
  on public.kakao_reports for delete
  using (auth.uid() = user_id);

-- 참고: user_api_keys 테이블은 threads/insta_auto_poster 등이 이미 만든 AIMaster 플랫폼
-- 공용 테이블을 그대로 재사용합니다 — 이 프로젝트에서 다시 만들지 않습니다.
-- Phase 2에서 카카오 채널(SOLAPI) 발송을 붙일 때도 trending-product-finder/crm-google-form이
-- 만든 공용 user_solapi_accounts 테이블을 그대로 재사용할 예정이며, 새 마이그레이션이
-- 필요하지 않습니다.
