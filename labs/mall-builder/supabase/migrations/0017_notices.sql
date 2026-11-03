-- AI 쇼핑몰 빌더 F19 — 공지(공지 블록·손님 공지 목록)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경(docs/mall/LESSONS_LEARNED.md 점검 목록).
-- 적용은 둘로 나눔: mall_builder_0017a_notices(표·읽기/쓰기/고치기 규칙) / mall_builder_0017b_notices_delete_policy(운영자 삭제 규칙)
-- 카테고리 표와 같은 방식: 쓰기는 그 몰 운영자만, 공개 읽기는 운영 중인 몰의 공지만. 본문은 일반 글(줄바꿈만, HTML 아님)

-- ── 0017a ──
create table if not exists public.mall_builder_notices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  body text not null default '' check (char_length(body) <= 5000),
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mall_builder_notices_list on public.mall_builder_notices (store_id, is_pinned desc, created_at desc);

alter table public.mall_builder_notices enable row level security;
create policy "mall_builder_notices_read" on public.mall_builder_notices
  for select using (public.mall_builder_is_store_staff(store_id) or exists (
    select 1 from public.mall_builder_stores s where s.id = store_id and s.status = 'active'
  ));
create policy "mall_builder_notices_insert" on public.mall_builder_notices
  for insert with check (public.mall_builder_is_store_staff(store_id));
create policy "mall_builder_notices_update" on public.mall_builder_notices
  for update using (public.mall_builder_is_store_staff(store_id)) with check (public.mall_builder_is_store_staff(store_id));

-- ── 0017b ──
create policy "mall_builder_notices_delete" on public.mall_builder_notices
  for delete using (public.mall_builder_is_store_staff(store_id));
