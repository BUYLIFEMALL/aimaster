-- AI 쇼핑몰 빌더 F01 — 몰 개설·운영자·몰 분리 보안 규칙
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용한다. 테이블 이름은 모두 이름표 "mall_builder_"로 시작한다.
-- 설계 근거: docs/mall/ARCHITECTURE.md §1·§3-1·§7
select lab_admin.register_program('mall-builder');

-- 몰 주소로 쓸 수 없는 예약어 (src/lib/slug.ts 의 RESERVED_SLUGS 와 같게 유지)
create or replace function public.mall_builder_is_reserved_slug(p_slug text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_slug = any (array[
    'admin','api','s','login','logout','signup','www','app','mall','store','stores',
    'help','guide','support','static','assets','public','dashboard','settings','new'
  ]);
$$;

-- 1) 몰
create table if not exists public.mall_builder_stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  slug text not null unique
    check (slug ~ '^[a-z0-9][a-z0-9-]{2,29}$' and slug !~ '--' and slug !~ '-$'),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  status text not null default 'active' check (status in ('active', 'suspended')),
  business_info jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  modules jsonb not null default '{"bank_transfer": true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- 1차는 회원 1명당 몰 1개 (여러 몰은 로드맵 3차)
create unique index if not exists mall_builder_stores_one_per_owner on public.mall_builder_stores (owner_id);

-- 2) 몰 운영자 (1차는 개설자 owner 한 줄만, 직원 부계정은 2차)
create table if not exists public.mall_builder_store_staff (
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);
create index if not exists mall_builder_store_staff_user on public.mall_builder_store_staff (user_id);

-- 3) 운영자 판정 — 모든 몰 데이터 보안 규칙이 이 함수 하나를 쓴다
create or replace function public.mall_builder_is_store_staff(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.mall_builder_store_staff s
    where s.store_id = p_store_id and s.user_id = auth.uid()
  );
$$;

-- 4) 보안 규칙
alter table public.mall_builder_stores enable row level security;
alter table public.mall_builder_store_staff enable row level security;

-- 영업 중인 몰은 누구나 보기(손님 화면), 정지된 몰은 그 몰 운영자만
create policy "mall_builder_stores_read" on public.mall_builder_stores
  for select using (status = 'active' or public.mall_builder_is_store_staff(id));
-- 고치기는 그 몰 운영자만. 상태(정지/재개)·주인·주소는 운영자도 못 바꾼다(아래 트리거)
create policy "mall_builder_stores_update" on public.mall_builder_stores
  for update using (public.mall_builder_is_store_staff(id)) with check (public.mall_builder_is_store_staff(id));
-- 만들기는 mall_builder_create_store() 로만, 지우기는 1차에 없음 (insert/delete 정책 없음 = 거부)

create policy "mall_builder_store_staff_read" on public.mall_builder_store_staff
  for select using (user_id = auth.uid() or public.mall_builder_is_store_staff(store_id));
-- 운영자 표 쓰기는 함수로만

create or replace function public.mall_builder_stores_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id <> old.owner_id or new.slug <> old.slug or new.status <> old.status or new.id <> old.id then
    -- 회원·비로그인(authenticated/anon 역할)은 막고, 플랫폼 관리자 작업(service_role·DB 관리자)만 허용
    if current_user in ('authenticated', 'anon') then
      raise exception '몰 주소·주인·상태는 바꿀 수 없습니다.' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists mall_builder_stores_guard on public.mall_builder_stores;
create trigger mall_builder_stores_guard
  before update on public.mall_builder_stores
  for each row execute function public.mall_builder_stores_guard();

-- 5) 몰 개설 — 몰과 운영자 줄을 한 번에 만든다
create or replace function public.mall_builder_create_store(p_slug text, p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_name text := btrim(coalesce(p_name, ''));
  v_id uuid;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다.' using errcode = '42501';
  end if;
  if v_slug !~ '^[a-z0-9][a-z0-9-]{2,29}$' or v_slug ~ '--' or v_slug ~ '-$' then
    raise exception '몰 주소는 영문 소문자·숫자·하이픈 3~30자로 입력해 주세요.' using errcode = '22023';
  end if;
  if public.mall_builder_is_reserved_slug(v_slug) then
    raise exception '이 주소는 쓸 수 없습니다: %', v_slug using errcode = '22023';
  end if;
  if char_length(v_name) not between 1 and 40 then
    raise exception '몰 이름은 1~40자로 입력해 주세요.' using errcode = '22023';
  end if;
  if exists (select 1 from public.mall_builder_stores where owner_id = v_uid) then
    raise exception '이미 개설한 몰이 있습니다(1차는 회원 1명당 몰 1개).' using errcode = '23505';
  end if;
  if exists (select 1 from public.mall_builder_stores where slug = v_slug) then
    raise exception '이미 쓰고 있는 몰 주소입니다: %', v_slug using errcode = '23505';
  end if;

  insert into public.mall_builder_stores (owner_id, slug, name)
  values (v_uid, v_slug, v_name)
  returning id into v_id;

  insert into public.mall_builder_store_staff (store_id, user_id, role)
  values (v_id, v_uid, 'owner');

  return v_slug;
end;
$$;

revoke all on function public.mall_builder_create_store(text, text) from public, anon;
grant execute on function public.mall_builder_create_store(text, text) to authenticated;
revoke all on function public.mall_builder_is_store_staff(uuid) from public;
grant execute on function public.mall_builder_is_store_staff(uuid) to anon, authenticated;
