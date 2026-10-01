-- 블로그 글감 수집 기능 (HTTP/RSS/Perplexity 3가지 방식 — threads_candidates와 동일 패턴).
-- title/summary/keywords는 실제 글 본문이 아니라 /blog/write/ai-form의 "블로그 주제"+
-- "검색 키워드" 입력을 미리 채워주기 위한 소재(글감)다. 실제 SEO 장문 글 생성은 이 후보를
-- 고른 뒤 기존 /api/auto-post 파이프라인이 담당한다.

create table if not exists public.blog_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null check (source_type in ('http', 'rss', 'perplexity')),
  source_input text not null,
  title text not null,
  summary text not null default '',
  keywords text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger blog_candidates_set_updated_at
  before update on public.blog_candidates
  for each row execute function public.set_updated_at();

create index if not exists blog_candidates_user_created_idx
  on public.blog_candidates (user_id, created_at desc);

alter table public.blog_candidates enable row level security;

create policy "blog_candidates_select_own"
  on public.blog_candidates for select
  using (auth.uid() = user_id);

create policy "blog_candidates_insert_own"
  on public.blog_candidates for insert
  with check (auth.uid() = user_id);

create policy "blog_candidates_update_own"
  on public.blog_candidates for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "blog_candidates_delete_own"
  on public.blog_candidates for delete
  using (auth.uid() = user_id);
