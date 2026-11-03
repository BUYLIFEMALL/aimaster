-- AI 쇼핑몰 빌더 F03 — 카테고리(최대 3단계·순서·숨김)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 설계: docs/mall/ARCHITECTURE.md §3-2
-- 1차는 부모 바꾸기(다른 부모 아래로 옮기기) 없음 — 만든 뒤 부모·몰은 바뀌지 않는다(트리거로 막음)

create table if not exists public.mall_builder_categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  parent_id uuid references public.mall_builder_categories (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  depth smallint not null default 1 check (depth between 1 and 3),
  sort integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mall_builder_categories_store on public.mall_builder_categories (store_id, parent_id, sort);

-- 깊이 계산·부모 검사·부모/몰 고정
create or replace function public.mall_builder_categories_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_parent public.mall_builder_categories%rowtype;
begin
  if tg_op = 'UPDATE' then
    if new.store_id <> old.store_id or new.parent_id is distinct from old.parent_id then
      raise exception '카테고리의 몰·상위 카테고리는 바꿀 수 없습니다.' using errcode = '22023';
    end if;
    new.depth := old.depth;
    new.updated_at := now();
    return new;
  end if;

  if new.parent_id is null then
    new.depth := 1;
  else
    select * into v_parent from public.mall_builder_categories where id = new.parent_id;
    if not found or v_parent.store_id <> new.store_id then
      raise exception '상위 카테고리를 찾을 수 없습니다.' using errcode = '22023';
    end if;
    if v_parent.depth >= 3 then
      raise exception '카테고리는 3단계까지만 만들 수 있습니다.' using errcode = '22023';
    end if;
    new.depth := v_parent.depth + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists mall_builder_categories_guard on public.mall_builder_categories;
create trigger mall_builder_categories_guard
  before insert or update on public.mall_builder_categories
  for each row execute function public.mall_builder_categories_guard();

alter table public.mall_builder_categories enable row level security;

-- 보기: 영업 중 몰의 보이는 카테고리는 누구나, 숨긴 것·정지 몰은 그 몰 운영자만
create policy "mall_builder_categories_read" on public.mall_builder_categories
  for select using (
    public.mall_builder_is_store_staff(store_id)
    or (is_visible and exists (select 1 from public.mall_builder_stores s where s.id = store_id and s.status = 'active'))
  );
-- 만들기·고치기·지우기: 그 몰 운영자만
create policy "mall_builder_categories_insert" on public.mall_builder_categories
  for insert with check (public.mall_builder_is_store_staff(store_id));
create policy "mall_builder_categories_update" on public.mall_builder_categories
  for update using (public.mall_builder_is_store_staff(store_id)) with check (public.mall_builder_is_store_staff(store_id));
create policy "mall_builder_categories_delete" on public.mall_builder_categories
  for delete using (public.mall_builder_is_store_staff(store_id));
