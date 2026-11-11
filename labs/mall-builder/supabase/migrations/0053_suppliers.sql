-- AI 쇼핑몰 빌더 D34 — 입점형 마켓플레이스 1단계: 공급사 계정(운영자 초대 → 공급사 수락)
-- 플랜 docs/PLAN_20261111_MARKETPLACE.md (주인님 2026-11-11 「추천안 4가지 그대로」: 운영자 초대만·공급가 방식·몰 배송비 정책)
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만(지우기 없음 — 공급사는 지우지 않고 「쉬는 중」·「초대 거둠」 표시).
-- 관리 권한: 상품 권한(products) 직원과 대표. 쓰기는 모두 아래 함수로만(표에는 읽기 규칙만).

create table if not exists public.mall_builder_suppliers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 60),
  email text not null check (char_length(email) between 3 and 120),
  biz_no text not null default '' check (char_length(biz_no) <= 20),
  contact_name text not null default '' check (char_length(contact_name) <= 30),
  phone text not null default '' check (char_length(phone) <= 30),
  memo text not null default '' check (char_length(memo) <= 300),
  status text not null default 'invited' check (status in ('invited', 'active', 'paused', 'revoked')),
  invite_token_hash text unique,
  invite_expires_at timestamptz,
  invited_by uuid,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mall_builder_suppliers_store on public.mall_builder_suppliers (store_id, created_at desc);
create unique index if not exists mall_builder_suppliers_store_user on public.mall_builder_suppliers (store_id, user_id) where user_id is not null;
alter table public.mall_builder_suppliers enable row level security;

-- 읽기: 상품 권한 운영자는 그 몰 공급사 전부, 공급사 본인은 자기 줄만(초대 토큰 해시는 화면에서 고르지 않음)
create policy mall_builder_suppliers_read on public.mall_builder_suppliers for select
  using (public.mall_builder_staff_can(store_id, 'products') or user_id = auth.uid());

-- 이 몰에서 쓸 수 있는(쉬는 중 아닌) 내 공급사 id — 다음 단계(상품·주문·정산) 보안 규칙이 이 함수 하나를 쓴다
create or replace function public.mall_builder_my_supplier_id(p_store_id uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select s.id from public.mall_builder_suppliers s
   where s.store_id = p_store_id and s.user_id = auth.uid() and s.status = 'active'
$$;

create or replace function mall_builder_private.supplier_clean(p text, n int)
returns text language sql immutable set search_path = '' as $$
  select left(btrim(regexp_replace(coalesce(p, ''), '[\r\n\t]+', ' ', 'g')), n)
$$;

-- 운영자: 공급사 초대(7일·1회용 링크). 토큰은 이때 한 번만 돌려주고 DB에는 해시만
create or replace function public.mall_builder_supplier_invite(p_store_id uuid, p_name text, p_email text, p_biz_no text, p_contact_name text, p_phone text, p_memo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_name text := mall_builder_private.supplier_clean(p_name, 60);
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_exp timestamptz := now() + interval '7 days';
  v_id uuid;
begin
  if auth.uid() is null or not public.mall_builder_staff_can(p_store_id, 'products') then
    raise exception '공급사 초대는 상품 권한이 있는 운영자만 할 수 있습니다.';
  end if;
  if v_name = '' then raise exception '공급사 이름을 적어 주세요.'; end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or char_length(v_email) > 120 then raise exception '공급사 이메일을 확인해 주세요.'; end if;
  if exists (select 1 from public.mall_builder_suppliers s where s.store_id = p_store_id and lower(s.email) = v_email and s.status in ('invited', 'active', 'paused')) then
    raise exception '이미 초대했거나 입점한 이메일입니다. 목록에서 링크를 다시 만들어 주세요.';
  end if;
  if (select count(*) from public.mall_builder_suppliers s where s.store_id = p_store_id and s.status <> 'revoked') >= 200 then
    raise exception '공급사는 몰 하나에 200곳까지 둘 수 있습니다.';
  end if;
  insert into public.mall_builder_suppliers (store_id, name, email, biz_no, contact_name, phone, memo, invite_token_hash, invite_expires_at, invited_by)
  values (p_store_id, v_name, v_email, mall_builder_private.supplier_clean(p_biz_no, 20), mall_builder_private.supplier_clean(p_contact_name, 30),
          mall_builder_private.supplier_clean(p_phone, 30), left(coalesce(p_memo, ''), 300),
          encode(extensions.digest(v_token, 'sha256'), 'hex'), v_exp, auth.uid())
  returning id into v_id;
  perform mall_builder_private.staff_log(p_store_id, 'supplier_invite', 'email', v_email, v_name);
  return jsonb_build_object('id', v_id, 'token', v_token, 'expires_at', v_exp);
end;
$$;

-- 운영자: 아직 수락 안 한 공급사의 초대 링크를 새로 만들기(옛 링크는 못 씀)
create or replace function public.mall_builder_supplier_reinvite(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.mall_builder_suppliers%rowtype;
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_exp timestamptz := now() + interval '7 days';
begin
  select * into s from public.mall_builder_suppliers x where x.id = p_id for update;
  if s.id is null or auth.uid() is null or not public.mall_builder_staff_can(s.store_id, 'products') then raise exception '공급사를 찾을 수 없습니다.'; end if;
  if s.status <> 'invited' then raise exception '수락을 기다리는 공급사만 링크를 다시 만들 수 있습니다.'; end if;
  update public.mall_builder_suppliers set invite_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'), invite_expires_at = v_exp, updated_at = now() where id = s.id;
  perform mall_builder_private.staff_log(s.store_id, 'supplier_reinvite', 'email', s.email, s.name);
  return jsonb_build_object('token', v_token, 'expires_at', v_exp);
end;
$$;

-- 공급사: 초대 수락 — 로그인 이메일이 초대 이메일과 같아야. 그 몰 운영자는 공급사가 될 수 없음
create or replace function public.mall_builder_supplier_accept(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.mall_builder_suppliers%rowtype;
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_slug text;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into s from public.mall_builder_suppliers x
   where x.invite_token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex') for update;
  if s.id is null or s.status <> 'invited' then raise exception '쓸 수 없는 초대 링크입니다.'; end if;
  if s.invite_expires_at <= now() then raise exception '초대 링크 기간(7일)이 지났습니다. 몰 운영자에게 다시 요청해 주세요.'; end if;
  if v_email <> lower(s.email) then
    raise exception '초대받은 이메일(%)로 로그인해 주세요.', left(s.email, 2) || '***@' || split_part(s.email, '@', 2);
  end if;
  if public.mall_builder_is_store_staff(s.store_id) then raise exception '이 몰의 운영자 계정은 공급사로 입점할 수 없습니다. 다른 계정으로 로그인해 주세요.'; end if;
  if exists (select 1 from public.mall_builder_suppliers x where x.store_id = s.store_id and x.user_id = auth.uid() and x.id <> s.id) then
    raise exception '이 계정은 이미 이 몰의 공급사입니다.';
  end if;
  update public.mall_builder_suppliers
     set user_id = auth.uid(), status = 'active', accepted_at = now(), invite_token_hash = null, invite_expires_at = null, updated_at = now()
   where id = s.id;
  perform mall_builder_private.staff_log(s.store_id, 'supplier_accept', 'email', s.email, s.name);
  select st.slug into v_slug from public.mall_builder_stores st where st.id = s.store_id;
  return jsonb_build_object('slug', v_slug);
end;
$$;

-- 운영자: 공급사 정보 고치기·쉬게 하기·다시 열기·초대 거두기(지우지 않음)
create or replace function public.mall_builder_supplier_update(p_id uuid, p_name text, p_biz_no text, p_contact_name text, p_phone text, p_memo text, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  s public.mall_builder_suppliers%rowtype;
  v_name text := mall_builder_private.supplier_clean(p_name, 60);
  v_status text := coalesce(p_status, '');
begin
  select * into s from public.mall_builder_suppliers x where x.id = p_id for update;
  if s.id is null or auth.uid() is null or not public.mall_builder_staff_can(s.store_id, 'products') then raise exception '공급사를 찾을 수 없습니다.'; end if;
  if v_name = '' then raise exception '공급사 이름을 적어 주세요.'; end if;
  if s.status = 'revoked' then raise exception '초대를 거둔 공급사는 고칠 수 없습니다. 새로 초대해 주세요.'; end if;
  -- 상태 바꾸기: 입점한 공급사는 active↔paused, 수락 전이면 invited→revoked만
  if v_status = '' or v_status = s.status then v_status := s.status;
  elsif s.status = 'invited' and v_status = 'revoked' then null;
  elsif s.status in ('active', 'paused') and v_status in ('active', 'paused') then null;
  else raise exception '바꿀 수 없는 상태입니다.';
  end if;
  update public.mall_builder_suppliers
     set name = v_name, biz_no = mall_builder_private.supplier_clean(p_biz_no, 20), contact_name = mall_builder_private.supplier_clean(p_contact_name, 30),
         phone = mall_builder_private.supplier_clean(p_phone, 30), memo = left(coalesce(p_memo, ''), 300), status = v_status,
         invite_token_hash = case when v_status = 'revoked' then null else invite_token_hash end,
         updated_at = now()
   where id = s.id;
  if v_status <> s.status then
    perform mall_builder_private.staff_log(s.store_id, 'supplier_status', 'email', s.email, s.status || '→' || v_status);
  end if;
end;
$$;

-- 공급사 본인: 담당자·연락처만 고치기(이름·사업자번호·상태는 운영자 몫)
create or replace function public.mall_builder_supplier_update_self(p_store_id uuid, p_contact_name text, p_phone text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  update public.mall_builder_suppliers
     set contact_name = mall_builder_private.supplier_clean(p_contact_name, 30), phone = mall_builder_private.supplier_clean(p_phone, 30), updated_at = now()
   where store_id = p_store_id and user_id = auth.uid() and status in ('active', 'paused');
  if not found then raise exception '이 몰의 공급사 계정이 아닙니다.'; end if;
end;
$$;

-- 내가 공급사로 들어간 몰 목록(처음 화면 「공급사로 입점한 몰」) — 정지된 몰도 이름은 보이게 definer로
create or replace function public.mall_builder_my_supplier_stores()
returns table (store_id uuid, slug text, store_name text, supplier_id uuid, supplier_name text, status text)
language sql stable security definer set search_path = '' as $$
  select st.id, st.slug, st.name, s.id, s.name, s.status
    from public.mall_builder_suppliers s join public.mall_builder_stores st on st.id = s.store_id
   where s.user_id = auth.uid() and s.status in ('active', 'paused')
   order by s.accepted_at
$$;

revoke all on function public.mall_builder_supplier_invite(uuid, text, text, text, text, text, text) from public, anon;
revoke all on function public.mall_builder_supplier_reinvite(uuid) from public, anon;
revoke all on function public.mall_builder_supplier_accept(text) from public, anon;
revoke all on function public.mall_builder_supplier_update(uuid, text, text, text, text, text, text) from public, anon;
revoke all on function public.mall_builder_supplier_update_self(uuid, text, text) from public, anon;
revoke all on function public.mall_builder_my_supplier_stores() from public, anon;
revoke all on function public.mall_builder_my_supplier_id(uuid) from public, anon;
grant execute on function public.mall_builder_supplier_invite(uuid, text, text, text, text, text, text) to authenticated;
grant execute on function public.mall_builder_supplier_reinvite(uuid) to authenticated;
grant execute on function public.mall_builder_supplier_accept(text) to authenticated;
grant execute on function public.mall_builder_supplier_update(uuid, text, text, text, text, text, text) to authenticated;
grant execute on function public.mall_builder_supplier_update_self(uuid, text, text) to authenticated;
grant execute on function public.mall_builder_my_supplier_stores() to authenticated;
grant execute on function public.mall_builder_my_supplier_id(uuid) to authenticated;
revoke all on function mall_builder_private.supplier_clean(text, int) from public, anon, authenticated;
