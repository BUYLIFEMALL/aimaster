-- AI 스마트스토어 상품 자동등록기 v1.23 — 판매자센터 화면 점검 결과(운영 DB esgxyikcnnvmlhygjkth)
-- 회원 확장이 7일마다(또는 「지금 점검」) 상품 등록 화면을 읽기만 해서, 확장이 쓰는 칸이 그대로 있는지 남긴다. 30일 자동 삭제.
create table if not exists public.smartstore_register_health (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','running','ok','changed','failed')),
  ext_version text,
  checked_total int,
  missing jsonb,                                   -- 바뀐(없어진) 칸 이름 목록
  conditional jsonb,                               -- 조건부라 못 본 칸(실패로 세지 않음)
  store_name text,                                 -- 판매자센터 스토어명(계정 혼동 확인용)
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists smartstore_register_health_user_idx on public.smartstore_register_health (user_id, created_at desc);
alter table public.smartstore_register_health enable row level security;
drop policy if exists "ssr_health_owner" on public.smartstore_register_health;
create policy "ssr_health_owner" on public.smartstore_register_health
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
