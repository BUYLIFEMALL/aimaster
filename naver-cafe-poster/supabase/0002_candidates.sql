-- 글감 수집 기능(HTTP/RSS/Perplexity, threads/shots의 콘텐츠 수집 패턴 재사용 —
-- docs/PLATFORM_PATTERNS.md §2 참고). newsblur_accounts는 앱 무관 공유 테이블이라
-- 새로 만들지 않고 그대로 재사용한다.
create table ncafe_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('http', 'rss', 'perplexity')),
  source_input text not null,
  title text not null,
  content text not null,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table ncafe_candidates enable row level security;

create policy "ncafe_candidates_owner" on ncafe_candidates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
