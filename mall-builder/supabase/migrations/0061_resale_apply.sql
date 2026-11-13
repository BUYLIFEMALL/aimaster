-- AI 쇼핑몰 빌더 T2-1 — 분양몰: 몰 종류·분양 신청·승인(분양자 소유 몰 생성)·이용 기간 (2026-11-13)
-- 설계 docs/PLAN_20261113_T2_RESALE_MALL.md. 결정: 결제는 본사 계좌·본사 토스(분양몰 사업자 정보 = 본사 복사, 분양자가 못 바꿈).
-- 추가·함수 추가만(drop 없음). Lab → 로컬 전체 실행 검사 → 운영(승인).

-- ── 몰 칸 ──
alter table public.mall_builder_stores add column if not exists kind text not null default 'standard';
alter table public.mall_builder_stores add column if not exists source_store_id uuid references public.mall_builder_stores (id);
alter table public.mall_builder_stores add column if not exists resale_expires_at timestamptz;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'mall_builder_stores_kind_check') then
    alter table public.mall_builder_stores add constraint mall_builder_stores_kind_check
      check (kind in ('standard', 'resale') and (kind = 'standard') = (source_store_id is null));
  end if;
end $c$;
create index if not exists mall_builder_stores_source on public.mall_builder_stores (source_store_id) where source_store_id is not null;

-- 분양몰은 사업자 정보(입금 계좌·판매자 표시)와 종류·원본·이용 기간을 분양자가 바꿀 수 없다(본사 직원·함수만)
create or replace function public.mall_builder_stores_resale_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.kind is distinct from old.kind or new.source_store_id is distinct from old.source_store_id
       or new.resale_expires_at is distinct from old.resale_expires_at then
      raise exception '분양몰 종류·이용 기간은 본사 「분양」 화면에서만 바꿀 수 있습니다.';
    end if;
    if old.kind = 'resale' and new.business_info is distinct from old.business_info
       and not public.mall_builder_staff_can(old.source_store_id, 'owner') then
      raise exception '분양몰의 사업자·입금 계좌 정보는 본사가 관리합니다.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists mall_builder_stores_resale_guard on public.mall_builder_stores;
create trigger mall_builder_stores_resale_guard before update on public.mall_builder_stores
  for each row execute function public.mall_builder_stores_resale_guard();

-- 이용 기간이 끝났거나 멈춘 분양몰은 새 주문을 받지 않는다(주문 함수는 그대로, 주문 표 앞에서 막음)
create or replace function public.mall_builder_orders_resale_open()
returns trigger language plpgsql security definer set search_path = '' as $$
declare s public.mall_builder_stores%rowtype;
begin
  select * into s from public.mall_builder_stores x where x.id = new.store_id;
  if s.kind = 'resale' and (s.resale_expires_at is null or s.resale_expires_at < now()) then
    raise exception '이 분양몰은 이용 기간이 끝나 지금은 주문할 수 없습니다.';
  end if;
  return new;
end;
$$;
drop trigger if exists mall_builder_orders_resale_open on public.mall_builder_orders;
create trigger mall_builder_orders_resale_open before insert on public.mall_builder_orders
  for each row execute function public.mall_builder_orders_resale_open();

-- ── 분양 신청 ──
create table if not exists public.mall_builder_resale_applications (
  id uuid primary key default gen_random_uuid(),
  source_store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{2,29}$' and slug !~ '--' and slug !~ '-$'),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  phone text not null default '' check (char_length(phone) <= 30),
  channel text not null default '' check (char_length(channel) <= 200),
  memo text not null default '' check (char_length(memo) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  note text not null default '' check (char_length(note) <= 300),
  store_id uuid references public.mall_builder_stores (id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid
);
create index if not exists mall_builder_resale_applications_source on public.mall_builder_resale_applications (source_store_id, status, created_at desc);
create unique index if not exists mall_builder_resale_applications_one_pending
  on public.mall_builder_resale_applications (source_store_id, user_id) where status = 'pending';
alter table public.mall_builder_resale_applications enable row level security;
-- 읽기: 신청자 본인, 원본 몰 대표. 쓰기는 함수로만
create policy mall_builder_resale_applications_read on public.mall_builder_resale_applications for select
  using (user_id = (select auth.uid()) or public.mall_builder_staff_can(source_store_id, 'owner'));

-- 분양을 받는 몰 목록(공개 안내 화면): 영업 중이고 「분양 받기」를 켠 일반 몰
create or replace function public.mall_builder_resale_sources()
returns table (id uuid, slug text, name text) language sql stable security definer set search_path = '' as $$
  select s.id, s.slug, s.name from public.mall_builder_stores s
   where s.kind = 'standard' and s.status = 'active' and coalesce((s.modules ->> 'resale')::boolean, false)
   order by s.created_at
$$;

-- 회원: 분양 신청
create or replace function public.mall_builder_resale_apply(p_source_slug text, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_src public.mall_builder_stores%rowtype;
  v_slug text := lower(btrim(coalesce(p ->> 'slug', '')));
  v_name text := btrim(coalesce(p ->> 'name', ''));
  v_id uuid;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.' using errcode = '42501'; end if;
  select * into v_src from public.mall_builder_stores s where s.slug = lower(btrim(coalesce(p_source_slug, '')));
  if v_src.id is null or v_src.kind <> 'standard' or v_src.status <> 'active' or not coalesce((v_src.modules ->> 'resale')::boolean, false) then
    raise exception '지금은 이 몰의 분양 신청을 받지 않습니다.';
  end if;
  if v_slug !~ '^[a-z0-9][a-z0-9-]{2,29}$' or v_slug ~ '--' or v_slug ~ '-$' then
    raise exception '몰 주소는 영문 소문자·숫자·하이픈 3~30자로 입력해 주세요.';
  end if;
  if public.mall_builder_is_reserved_slug(v_slug) then raise exception '이 주소는 쓸 수 없습니다: %', v_slug; end if;
  if char_length(v_name) not between 1 and 40 then raise exception '몰 이름은 1~40자로 입력해 주세요.'; end if;
  if exists (select 1 from public.mall_builder_stores s where s.slug = v_slug)
     or exists (select 1 from public.mall_builder_resale_applications a where a.slug = v_slug and a.status = 'pending') then
    raise exception '이미 쓰고 있거나 신청된 몰 주소입니다: %', v_slug;
  end if;
  if exists (select 1 from public.mall_builder_resale_applications a where a.source_store_id = v_src.id and a.user_id = v_uid and a.status = 'pending') then
    raise exception '이미 승인을 기다리는 신청이 있습니다.';
  end if;
  if exists (select 1 from public.mall_builder_stores s where s.source_store_id = v_src.id and s.owner_id = v_uid) then
    raise exception '이미 이 몰의 분양몰을 갖고 있습니다.';
  end if;
  insert into public.mall_builder_resale_applications (source_store_id, user_id, slug, name, phone, channel, memo)
  values (v_src.id, v_uid, v_slug, v_name, left(btrim(coalesce(p ->> 'phone', '')), 30),
          left(btrim(coalesce(p ->> 'channel', '')), 200), left(btrim(coalesce(p ->> 'memo', '')), 500))
  returning id into v_id;
  return v_id;
end;
$$;

-- 회원: 내 신청 취소(승인 전)
create or replace function public.mall_builder_resale_cancel(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.mall_builder_resale_applications set status = 'cancelled', decided_at = now()
   where id = p_id and user_id = auth.uid() and status = 'pending';
  if not found then raise exception '취소할 신청을 찾을 수 없습니다.'; end if;
end;
$$;

-- 원본 몰 대표: 승인(분양자 소유 분양몰 생성·이용 기간) / 반려(사유)
create or replace function public.mall_builder_resale_decide(p_id uuid, p_action text, p_days int, p_note text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  a public.mall_builder_resale_applications%rowtype;
  v_src public.mall_builder_stores%rowtype;
  v_store uuid;
  v_note text := left(btrim(coalesce(p_note, '')), 300);
begin
  select * into a from public.mall_builder_resale_applications x where x.id = p_id for update;
  if a.id is null or auth.uid() is null or not public.mall_builder_staff_can(a.source_store_id, 'owner') then raise exception '신청을 찾을 수 없습니다.'; end if;
  if a.status <> 'pending' then raise exception '이미 처리된 신청입니다.'; end if;
  if p_action = 'reject' then
    if v_note = '' then raise exception '반려 사유를 적어 주세요(신청자에게 보입니다).'; end if;
    update public.mall_builder_resale_applications set status = 'rejected', note = v_note, decided_at = now(), decided_by = auth.uid() where id = a.id;
    perform mall_builder_private.staff_log(a.source_store_id, 'resale_reject', 'resale_application', a.id::text, a.slug);
    return 'rejected';
  end if;
  if p_action <> 'approve' then raise exception '알 수 없는 처리입니다.'; end if;
  if p_days is null or p_days not between 1 and 3650 then raise exception '이용 기간(일)을 1~3650 사이로 적어 주세요.'; end if;
  if exists (select 1 from public.mall_builder_stores s where s.slug = a.slug) then raise exception '그 몰 주소는 이미 쓰고 있습니다. 반려 후 다시 신청받아 주세요.'; end if;
  select * into v_src from public.mall_builder_stores s where s.id = a.source_store_id;
  insert into public.mall_builder_stores (owner_id, slug, name, kind, source_store_id, resale_expires_at, business_info, modules)
  values (a.user_id, a.slug, btrim(a.name), 'resale', v_src.id, now() + make_interval(days => p_days), v_src.business_info,
          jsonb_build_object('bank_transfer', true))
  returning id into v_store;
  insert into public.mall_builder_store_staff (store_id, user_id, role) values (v_store, a.user_id, 'owner');
  update public.mall_builder_resale_applications set status = 'approved', note = v_note, store_id = v_store, decided_at = now(), decided_by = auth.uid() where id = a.id;
  perform mall_builder_private.staff_log(a.source_store_id, 'resale_approve', 'resale_application', a.id::text, a.slug);
  return a.slug;
end;
$$;

-- 원본 몰 대표: 이용 기간 바꾸기(오늘부터 N일, 0이면 바로 끝냄)
create or replace function public.mall_builder_resale_set_period(p_store_id uuid, p_days int)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare s public.mall_builder_stores%rowtype; v_until timestamptz;
begin
  select * into s from public.mall_builder_stores x where x.id = p_store_id for update;
  if s.id is null or s.kind <> 'resale' or auth.uid() is null or not public.mall_builder_staff_can(s.source_store_id, 'owner') then raise exception '분양몰을 찾을 수 없습니다.'; end if;
  if p_days is null or p_days not between 0 and 3650 then raise exception '이용 기간(일)을 0~3650 사이로 적어 주세요.'; end if;
  v_until := now() + make_interval(days => p_days);
  update public.mall_builder_stores set resale_expires_at = v_until, updated_at = now() where id = s.id;
  perform mall_builder_private.staff_log(s.source_store_id, 'resale_period', 'store', s.id::text, p_days::text);
  return v_until;
end;
$$;

-- 원본 몰 대표: 분양 받기 켜기/끄기
create or replace function public.mall_builder_resale_set_open(p_store_id uuid, p_open boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.mall_builder_staff_can(p_store_id, 'owner') then raise exception '몰을 찾을 수 없습니다.'; end if;
  update public.mall_builder_stores set modules = modules || jsonb_build_object('resale', coalesce(p_open, false)), updated_at = now()
   where id = p_store_id and kind = 'standard';
  if not found then raise exception '분양몰에서는 분양을 받을 수 없습니다.'; end if;
end;
$$;

-- ── 권한 ──
revoke all on function public.mall_builder_stores_resale_guard() from public, anon, authenticated;
revoke all on function public.mall_builder_orders_resale_open() from public, anon, authenticated;
revoke all on function public.mall_builder_resale_apply(text, jsonb) from public, anon;
revoke all on function public.mall_builder_resale_cancel(uuid) from public, anon;
revoke all on function public.mall_builder_resale_decide(uuid, text, int, text) from public, anon;
revoke all on function public.mall_builder_resale_set_period(uuid, int) from public, anon;
revoke all on function public.mall_builder_resale_set_open(uuid, boolean) from public, anon;
grant execute on function public.mall_builder_resale_sources() to anon, authenticated;
grant execute on function public.mall_builder_resale_apply(text, jsonb) to authenticated;
grant execute on function public.mall_builder_resale_cancel(uuid) to authenticated;
grant execute on function public.mall_builder_resale_decide(uuid, text, int, text) to authenticated;
grant execute on function public.mall_builder_resale_set_period(uuid, int) to authenticated;
grant execute on function public.mall_builder_resale_set_open(uuid, boolean) to authenticated;
