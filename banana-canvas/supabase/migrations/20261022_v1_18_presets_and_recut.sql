-- AI 바나나 캔버스 v1.18 (2026-10-22, 이미지 카테고리 플랜 F2) — 운영 DB ref esgxyikcnnvmlhygjkth
-- ① 「내 작업 레시피」: 회원이 저장한 편집 설정(그림이 아니라 설정값 — 환경설정이라 30일 삭제 대상 아님, 회원당 20개까지는 API에서 제한)
-- ② 「이 컷만 다시」: 같은 기록에 대한 동시 요청(이중 과금)을 막는 선점 칸 busy_until

create table if not exists public.banana_canvas_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('edit', 'restore', 'comic')),
  name text not null check (char_length(name) between 1 and 30),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists banana_canvas_presets_user_idx on public.banana_canvas_presets (user_id, created_at desc);

alter table public.banana_canvas_presets enable row level security;

create policy "banana_canvas_presets_owner_select" on public.banana_canvas_presets
  for select using (auth.uid() = user_id);
create policy "banana_canvas_presets_owner_insert" on public.banana_canvas_presets
  for insert with check (auth.uid() = user_id);
create policy "banana_canvas_presets_owner_delete" on public.banana_canvas_presets
  for delete using (auth.uid() = user_id);

alter table public.banana_canvas_results add column if not exists busy_until timestamptz;
