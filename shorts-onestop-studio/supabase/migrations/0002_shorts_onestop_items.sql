-- AI 쇼츠 원스톱 제작 자동화 — 회원별 저장 데이터(프로젝트·프리셋·카테고리 지침·발행 계획·설정) 한 테이블 (2026-10-16 P2)
-- 플랜(docs/CARD_SHORTS_REFERENCE_ANALYSIS.md §5-1 "저장 데이터는 DB(user_id + RLS)") 승인 범위. blog-workroom_items와 같은 구조.
create table if not exists public.shorts_onestop_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('project','preset','guideline','plan','settings')),
  title text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shorts_onestop_items_user_kind_idx on public.shorts_onestop_items(user_id, kind, updated_at desc);

alter table public.shorts_onestop_items enable row level security;
drop policy if exists "shorts_onestop_items_select_own" on public.shorts_onestop_items;
drop policy if exists "shorts_onestop_items_insert_own" on public.shorts_onestop_items;
drop policy if exists "shorts_onestop_items_update_own" on public.shorts_onestop_items;
drop policy if exists "shorts_onestop_items_delete_own" on public.shorts_onestop_items;
create policy "shorts_onestop_items_select_own" on public.shorts_onestop_items for select using (auth.uid() = user_id);
create policy "shorts_onestop_items_insert_own" on public.shorts_onestop_items for insert with check (auth.uid() = user_id);
create policy "shorts_onestop_items_update_own" on public.shorts_onestop_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "shorts_onestop_items_delete_own" on public.shorts_onestop_items for delete using (auth.uid() = user_id);
