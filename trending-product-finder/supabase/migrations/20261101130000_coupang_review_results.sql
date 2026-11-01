-- 쿠팡 리뷰 거르기 결과 회원별 저장(2026-11-01 주인님 승인). 쿠팡 호출은 회원 PC에서만 하고 공개 상품 정보만 저장한다.
-- 보관 1년: docs/TOP_RULE_PERSONAL_ACCOUNT_API.md §8 보관 기간 지정 목록, 정리 app/api/cron/cleanup-generated.
create table if not exists public.coupang_review_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  keyword text not null default '',
  label text,
  item_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists coupang_review_runs_user_created_idx on public.coupang_review_runs(user_id, created_at desc);
create index if not exists coupang_review_runs_created_idx on public.coupang_review_runs(created_at);

create table if not exists public.coupang_review_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.coupang_review_runs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null,
  name text not null default '',
  price integer,
  reviews integer not null default 0,
  is_ad boolean not null default false,
  url text not null,
  unique (run_id, product_id)
);
create index if not exists coupang_review_items_run_idx on public.coupang_review_items(run_id, reviews desc);
create index if not exists coupang_review_items_user_idx on public.coupang_review_items(user_id);

alter table public.coupang_review_runs enable row level security;
alter table public.coupang_review_items enable row level security;

drop policy if exists "owner reads coupang review runs" on public.coupang_review_runs;
create policy "owner reads coupang review runs" on public.coupang_review_runs for select using (auth.uid() = user_id);
drop policy if exists "owner updates coupang review runs" on public.coupang_review_runs;
create policy "owner updates coupang review runs" on public.coupang_review_runs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "owner deletes coupang review runs" on public.coupang_review_runs;
create policy "owner deletes coupang review runs" on public.coupang_review_runs for delete using (auth.uid() = user_id);
drop policy if exists "owner reads coupang review items" on public.coupang_review_items;
create policy "owner reads coupang review items" on public.coupang_review_items for select using (auth.uid() = user_id);

select 'coupang_review_runs' as tbl, count(*) from public.coupang_review_runs
union all select 'coupang_review_items', count(*) from public.coupang_review_items;
