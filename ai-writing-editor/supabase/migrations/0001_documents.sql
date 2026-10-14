-- AI 글쓰기 에디터 자동화 (slug: ai-writing-editor) — 문서 테이블 (v1.01, 2026-10-14)
-- 공용 Supabase(AIMaster) 한 곳을 쓴다. 회원 본인 문서만 읽고 쓸 수 있다(RLS owner-only).
-- 서버는 service role로 접근하며 모든 쿼리에서 user_id로 직접 거른다. 회원당 최대 30개는 서버가 정리한다.
-- API 키는 공용 user_api_keys의 기존 provider(gemini)를 그대로 쓴다 — 제약 변경 없음.

create table if not exists public.ai_writing_editor_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '제목 없는 글',
  content text not null default '',
  format text not null default 'free' check (format in ('blog','essay','email','report','press','cover','product','sns','free')),
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_writing_editor_documents_user_updated_idx
  on public.ai_writing_editor_documents (user_id, updated_at desc);

alter table public.ai_writing_editor_documents enable row level security;

create policy "ai_writing_editor_documents_owner_select" on public.ai_writing_editor_documents
  for select using (auth.uid() = user_id);
create policy "ai_writing_editor_documents_owner_insert" on public.ai_writing_editor_documents
  for insert with check (auth.uid() = user_id);
create policy "ai_writing_editor_documents_owner_update" on public.ai_writing_editor_documents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_writing_editor_documents_owner_delete" on public.ai_writing_editor_documents
  for delete using (auth.uid() = user_id);
