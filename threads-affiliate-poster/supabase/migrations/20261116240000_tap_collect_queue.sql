-- 2026-11-16 threads-auto(MIT) 이식 2단계(주인님 결정 3·6): 네이버 브랜드커넥트 링크 수집 대기열.
-- 회원 브라우저의 확장이 naver.me 링크를 열어 실제 상품 페이지에서 읽은 상품명·이미지·후기·상품 정보를 회원 소유로 보관한다.
-- 30일 뒤 /api/cron/cleanup-media가 지운다(profiles.retention_exempt 회원 제외). 상품 등록 뒤에도 근거는 이 표에만 둔다.
create table if not exists public.tap_collect_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  affiliate_url text not null,
  status text not null default 'pending'
    check (status in ('pending', 'ready', 'needs_review', 'registered')),
  connect_kind text check (connect_kind in ('SHOPPING', 'TRAVEL')),
  final_url text,
  product_name text,
  image_urls jsonb not null default '[]'::jsonb,
  reviews jsonb not null default '[]'::jsonb,
  facts jsonb not null default '[]'::jsonb,
  error text,
  product_id uuid references public.affiliate_products (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tap_collect_queue_user_created_idx on public.tap_collect_queue (user_id, created_at desc);
create index if not exists tap_collect_queue_product_idx on public.tap_collect_queue (product_id) where product_id is not null;

alter table public.tap_collect_queue enable row level security;

drop policy if exists tap_collect_queue_owner on public.tap_collect_queue;
create policy tap_collect_queue_owner on public.tap_collect_queue
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
