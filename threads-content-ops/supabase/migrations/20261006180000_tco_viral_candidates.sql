-- v1.34 떡상 콘텐츠 등록(글감 수집) 후보 보관 테이블.
-- threads/ 의 threads_candidates 구조를 참고하되, 이 프로그램은 회원별 풀로 단순화한다(카테고리 없음).
-- 원문 전체는 저장하지 않고, AI가 정리한 후보(제목·본문·키워드)와 출처 주소/주제만 저장한다.
-- 멀티테넌시: user_id + RLS owner-only(authenticated 전용), anon 권한 없음. "service role용" 정책은 만들지 않는다.

create table if not exists public.tco_viral_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  method text not null check (method in ('http', 'perplexity')),
  source_input text not null default '',
  title text not null default '',
  content text not null default '',
  keywords text[] not null default '{}',
  status text not null default 'ready' check (status in ('ready', 'used', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tco_viral_candidates_user_status_idx
  on public.tco_viral_candidates(user_id, status, created_at desc);

alter table public.tco_viral_candidates enable row level security;

revoke all on table public.tco_viral_candidates from anon, authenticated;
grant select, insert, update, delete on table public.tco_viral_candidates to authenticated;

create policy "tco_viral_candidates_select_own" on public.tco_viral_candidates
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "tco_viral_candidates_insert_own" on public.tco_viral_candidates
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "tco_viral_candidates_update_own" on public.tco_viral_candidates
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tco_viral_candidates_delete_own" on public.tco_viral_candidates
  for delete to authenticated using ((select auth.uid()) = user_id);
