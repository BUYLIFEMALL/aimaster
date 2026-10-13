-- AI 바나나 캔버스 자동화 (slug: banana-canvas) — 결과 기록 테이블 + 비공개 파일 버킷 (v1.01, 2026-10-14)
-- 공용 Supabase(AIMaster) 한 곳을 쓴다. 회원 본인 기록만 읽고 쓸 수 있다(RLS owner-only).
-- 주의: Supabase MCP execute_sql은 여러 문장을 한 번에 보내면 거부될 수 있어 문장별로 적용했다.

create table if not exists public.banana_canvas_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null default '',
  prompt text not null default '',
  options jsonb not null default '{}'::jsonb,
  input_paths jsonb not null default '[]'::jsonb,
  -- [{path, mime, w, h, text?}] 결과 이미지(스토리·레시피는 여러 장)
  outputs jsonb not null default '[]'::jsonb,
  model_used text not null default '',
  favorite boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists banana_canvas_results_user_created_idx
  on public.banana_canvas_results (user_id, created_at desc);

alter table public.banana_canvas_results enable row level security;

create policy "banana_canvas_results_owner_select" on public.banana_canvas_results
  for select using (auth.uid() = user_id);
create policy "banana_canvas_results_owner_insert" on public.banana_canvas_results
  for insert with check (auth.uid() = user_id);
create policy "banana_canvas_results_owner_update" on public.banana_canvas_results
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "banana_canvas_results_owner_delete" on public.banana_canvas_results
  for delete using (auth.uid() = user_id);

-- 파일 버킷: 비공개, 파일당 20MB 제한. 정책을 만들지 않는다 — 서버(service role)가 서명 URL 발급·읽기·삭제만 한다.
-- 경로: <uid>/in/<uuid>.<ext>(입력·마스크, 1시간 후 정리) / <uid>/out/<uuid>.<ext>(결과)
insert into storage.buckets (id, name, public, file_size_limit)
values ('banana-canvas-files', 'banana-canvas-files', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = 20971520;
