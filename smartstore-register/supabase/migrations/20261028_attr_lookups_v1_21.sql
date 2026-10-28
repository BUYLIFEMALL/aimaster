-- AI 스마트스토어 상품 자동등록기 v1.21 — 상품속성 불러오기 요청·결과 (운영 DB esgxyikcnnvmlhygjkth)
-- 회원 확장이 판매자센터에서 카테고리 속성 목록을 「읽기만」 해서 돌려준 결과를 회원별로 둔다. 30일 자동 삭제(/api/cron/cleanup).
create table if not exists public.smartstore_register_attr_lookups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null default '',                 -- 카테고리 검색어(예: 백팩)
  category_path text not null default '',          -- 상세페이지 상품 카테고리 경로(고를 때 우선)
  category_id text,                                -- 확장이 고른(또는 회원이 지정한) 판매자센터 카테고리 번호
  status text not null default 'queued' check (status in ('queued','running','done','failed')),
  result jsonb,                                    -- { category: {id, path}, candidates: [{id, path}], attributes: [{name, type, max, required, values: []}] }
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists smartstore_register_attr_lookups_user_idx on public.smartstore_register_attr_lookups (user_id, created_at desc);
alter table public.smartstore_register_attr_lookups enable row level security;
drop policy if exists "ssr_attr_owner" on public.smartstore_register_attr_lookups;
create policy "ssr_attr_owner" on public.smartstore_register_attr_lookups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
