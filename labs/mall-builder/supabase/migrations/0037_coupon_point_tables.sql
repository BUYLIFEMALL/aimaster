-- AI 쇼핑몰 빌더 D17 쿠폰 · D18 포인트 — 표·칸·보안 규칙 (플랜 docs/PLAN_20261109_COUPON_POINT.md)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만(지우기·권한 회수·제약 변경 없음 — docs/mall/LESSONS_LEARNED.md).
-- 금액 원칙: 주문 total = 현금(입금·카드·외상)으로 내는 금액. 쿠폰 할인·사용 포인트는 따로 칸에 둔다
--   → 카드 승인·환불, 외상 장부, 알림 문구는 그대로 total을 쓴다.

-- 손님 생일(월-일, 연도는 받지 않음) — 생일 쿠폰용, 선택
alter table public.mall_builder_store_customers add column if not exists birth_md text
  check (birth_md is null or birth_md ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$');
-- 등급별 적립률(%) — 비우면 몰 기본 적립률
alter table public.mall_builder_customer_grades add column if not exists point_rate numeric(4,1)
  check (point_rate is null or (point_rate >= 0 and point_rate <= 50));

-- ── 쿠폰 ──
create table if not exists public.mall_builder_coupons (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  discount_type text not null check (discount_type in ('amount', 'rate')),
  value integer not null check (value > 0),
  max_discount bigint check (max_discount is null or max_discount > 0),
  min_order bigint not null default 0 check (min_order >= 0),
  valid_days integer check (valid_days is null or valid_days between 1 and 3650),
  ends_at timestamptz,
  target text not null default 'all' check (target in ('all', 'category', 'product')),
  target_ids uuid[] not null default '{}',
  allow_business boolean not null default false,
  issue_mode text not null check (issue_mode in ('manual', 'download', 'code', 'signup', 'birthday')),
  code text check (code is null or code ~ '^[A-Z0-9]{4,20}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint mall_builder_coupons_rate_max check (discount_type <> 'rate' or value <= 90),
  constraint mall_builder_coupons_code_mode check ((issue_mode = 'code') = (code is not null)),
  constraint mall_builder_coupons_targets check (target = 'all' or cardinality(target_ids) between 1 and 200)
);
create unique index if not exists mall_builder_coupons_store_code on public.mall_builder_coupons (store_id, code) where code is not null;
create index if not exists mall_builder_coupons_store on public.mall_builder_coupons (store_id, created_at desc);
alter table public.mall_builder_coupons enable row level security;
-- 운영자는 전부, 손님은 「받을 수 있는 쿠폰」(다운로드형·켜짐·활성 몰)만
create policy mall_builder_coupons_read on public.mall_builder_coupons for select using (
  public.mall_builder_is_store_staff(store_id)
  or (is_active and issue_mode = 'download' and (ends_at is null or ends_at > now())
      and exists (select 1 from public.mall_builder_stores s where s.id = mall_builder_coupons.store_id and s.status = 'active'))
);
create policy mall_builder_coupons_insert on public.mall_builder_coupons for insert with check (public.mall_builder_is_store_staff(store_id));
create policy mall_builder_coupons_update on public.mall_builder_coupons for update using (public.mall_builder_is_store_staff(store_id)) with check (public.mall_builder_is_store_staff(store_id));
-- 지우기 규칙은 두지 않는다(쓴 주문 기록 보존) — 「끄기」로 멈춘다

-- 손님이 가진 쿠폰(발급 1건 = 1줄). 같은 쿠폰은 손님당 1장, 생일 쿠폰은 해마다(issue_key = 연도)
create table if not exists public.mall_builder_coupon_issues (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  coupon_id uuid not null references public.mall_builder_coupons (id) on delete cascade,
  customer_id uuid not null references public.mall_builder_store_customers (id) on delete cascade,
  issue_key text not null default '',
  source text not null check (source in ('manual', 'download', 'code', 'signup', 'birthday')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  used_at timestamptz,
  order_id uuid references public.mall_builder_orders (id) on delete set null,
  discount bigint,
  unique (coupon_id, customer_id, issue_key)
);
create index if not exists mall_builder_coupon_issues_customer on public.mall_builder_coupon_issues (customer_id, issued_at desc);
create index if not exists mall_builder_coupon_issues_store on public.mall_builder_coupon_issues (store_id, issued_at desc);
alter table public.mall_builder_coupon_issues enable row level security;
create policy mall_builder_coupon_issues_read on public.mall_builder_coupon_issues for select using (
  public.mall_builder_is_store_staff(store_id)
  or exists (select 1 from public.mall_builder_store_customers c where c.id = mall_builder_coupon_issues.customer_id and c.user_id = (select auth.uid()))
);
-- 쓰기는 DB 함수만(규칙 없음)

-- ── 포인트 ──
create table if not exists public.mall_builder_point_settings (
  store_id uuid primary key references public.mall_builder_stores (id) on delete cascade,
  enabled boolean not null default false,
  earn_rate numeric(4,1) not null default 1.0 check (earn_rate >= 0 and earn_rate <= 50),
  min_use bigint not null default 1000 check (min_use >= 0),
  use_unit integer not null default 100 check (use_unit between 1 and 10000),
  max_use_rate integer not null default 100 check (max_use_rate between 1 and 100),
  expire_months integer not null default 12 check (expire_months between 1 and 60),
  expire_notice boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.mall_builder_point_settings enable row level security;
create policy mall_builder_point_settings_read on public.mall_builder_point_settings for select using (true);
create policy mall_builder_point_settings_insert on public.mall_builder_point_settings for insert with check (public.mall_builder_is_store_staff(store_id));
create policy mall_builder_point_settings_update on public.mall_builder_point_settings for update using (public.mall_builder_is_store_staff(store_id)) with check (public.mall_builder_is_store_staff(store_id));

-- 포인트 장부. 들어온 줄(earn·refund·admin +)은 remaining(남은 양)과 expires_at(소멸일)을 가진 「묶음」 — 쓸 때 소멸일 빠른 묶음부터 꺼낸다
create table if not exists public.mall_builder_point_ledger (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  customer_id uuid not null references public.mall_builder_store_customers (id) on delete cascade,
  order_id uuid references public.mall_builder_orders (id) on delete set null,
  kind text not null check (kind in ('earn', 'use', 'refund', 'expire', 'admin')),
  amount bigint not null check (amount <> 0),
  remaining bigint not null default 0 check (remaining >= 0),
  expires_at timestamptz,
  notified_at timestamptz,
  note text not null default '' check (char_length(note) <= 200),
  actor_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists mall_builder_point_ledger_customer on public.mall_builder_point_ledger (customer_id, created_at desc);
create index if not exists mall_builder_point_ledger_lots on public.mall_builder_point_ledger (store_id, expires_at) where remaining > 0;
alter table public.mall_builder_point_ledger enable row level security;
create policy mall_builder_point_ledger_read on public.mall_builder_point_ledger for select using (
  public.mall_builder_is_store_staff(store_id)
  or exists (select 1 from public.mall_builder_store_customers c where c.id = mall_builder_point_ledger.customer_id and c.user_id = (select auth.uid()))
);

-- ── 주문 칸 ──
alter table public.mall_builder_orders add column if not exists coupon_issue_id uuid references public.mall_builder_coupon_issues (id) on delete set null;
alter table public.mall_builder_orders add column if not exists coupon_discount bigint not null default 0 check (coupon_discount >= 0);
alter table public.mall_builder_orders add column if not exists point_used bigint not null default 0 check (point_used >= 0);
alter table public.mall_builder_orders add column if not exists points_earned bigint not null default 0 check (points_earned >= 0);
-- 주문 때 쿠폰 대상이었던 품목(부분 취소 때 남은 대상 금액을 다시 셀 때 씀)
alter table public.mall_builder_order_items add column if not exists coupon_eligible boolean not null default false;
