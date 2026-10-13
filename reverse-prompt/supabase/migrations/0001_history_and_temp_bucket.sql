-- AI 리버스 프롬프트 자동화 (slug: reverse-prompt) — 분석 기록 테이블 + 비공개 임시 업로드 버킷 (v1.01)
-- 공용 Supabase(AIMaster) 한 곳을 쓴다. 회원 본인 기록만 읽고 쓸 수 있다(RLS owner-only).

create table if not exists public.reverse_prompt_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '제목 없는 분석',
  media_type text not null check (media_type in ('image','video','audio')),
  mime text not null default '',
  file_name text not null default '',
  options jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  prompt text not null default '',
  model_used text not null default '',
  thumb text,
  favorite boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists reverse_prompt_history_user_created_idx
  on public.reverse_prompt_history (user_id, created_at desc);

alter table public.reverse_prompt_history enable row level security;

drop policy if exists "reverse_prompt_history_owner_select" on public.reverse_prompt_history;
create policy "reverse_prompt_history_owner_select" on public.reverse_prompt_history
  for select using (auth.uid() = user_id);
drop policy if exists "reverse_prompt_history_owner_insert" on public.reverse_prompt_history;
create policy "reverse_prompt_history_owner_insert" on public.reverse_prompt_history
  for insert with check (auth.uid() = user_id);
drop policy if exists "reverse_prompt_history_owner_update" on public.reverse_prompt_history;
create policy "reverse_prompt_history_owner_update" on public.reverse_prompt_history
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "reverse_prompt_history_owner_delete" on public.reverse_prompt_history;
create policy "reverse_prompt_history_owner_delete" on public.reverse_prompt_history
  for delete using (auth.uid() = user_id);

-- 임시 업로드 버킷: 비공개, 50MB 제한. 정책을 만들지 않는다 — 서버(service role)가 서명 URL을 발급·읽기·삭제만 한다.
insert into storage.buckets (id, name, public, file_size_limit)
values ('reverse-prompt-tmp', 'reverse-prompt-tmp', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;
