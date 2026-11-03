-- AI 쇼핑몰 빌더 F12 — 손님 등급·사업자 회원 신청/승인/반려
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만 적용. 추가만 하는 변경(확인 창 방지 — revoke·drop·delete 없음)
-- 승인 상태·등급·사업자 칸은 손님이 직접 바꾸지 못한다: 손님 요청(current_user = authenticated/anon)이면 트리거가 원래 값으로 되돌리고,
-- 신청(mall_builder_apply_business)·심사(mall_builder_review_business) DB 함수만 바꾼다(security definer라 current_user가 함수 주인).

create table if not exists public.mall_builder_customer_grades (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  code text not null check (code ~ '^[a-z0-9_]{2,20}$'),
  name text not null check (char_length(btrim(name)) between 1 and 20),
  rank integer not null default 0,
  is_business boolean not null default false,
  created_at timestamptz not null default now(),
  unique (store_id, code)
);

-- 몰마다 기본 등급 두 개: 일반(소비자)·사업자(승인 필요)
create or replace function public.mall_builder_default_grades(p_store_id uuid)
returns void language sql set search_path = '' as $$
  insert into public.mall_builder_customer_grades (store_id, code, name, rank, is_business)
  values (p_store_id, 'consumer', '일반', 0, false), (p_store_id, 'business', '사업자', 10, true)
  on conflict (store_id, code) do nothing;
$$;
create or replace function public.mall_builder_stores_default_grades()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.mall_builder_default_grades(new.id);
  return new;
end;
$$;
create trigger mall_builder_stores_default_grades after insert on public.mall_builder_stores
  for each row execute function public.mall_builder_stores_default_grades();
select public.mall_builder_default_grades(s.id) from public.mall_builder_stores s;

alter table public.mall_builder_customer_grades enable row level security;
create policy "mall_builder_customer_grades_read" on public.mall_builder_customer_grades
  for select using (
    public.mall_builder_is_store_staff(store_id)
    or exists (select 1 from public.mall_builder_stores s where s.id = store_id and s.status = 'active')
  );
create policy "mall_builder_customer_grades_write" on public.mall_builder_customer_grades
  for all using (public.mall_builder_is_store_staff(store_id)) with check (public.mall_builder_is_store_staff(store_id));

alter table public.mall_builder_store_customers add column if not exists grade_id uuid references public.mall_builder_customer_grades (id) on delete set null;
alter table public.mall_builder_store_customers add column if not exists kind text not null default 'consumer' check (kind in ('consumer', 'business'));
alter table public.mall_builder_store_customers add column if not exists approval_status text not null default 'none' check (approval_status in ('none', 'pending', 'approved', 'rejected'));
alter table public.mall_builder_store_customers add column if not exists business_no text;
alter table public.mall_builder_store_customers add column if not exists company text;
alter table public.mall_builder_store_customers add column if not exists ceo_name text;
alter table public.mall_builder_store_customers add column if not exists cert_path text;
alter table public.mall_builder_store_customers add column if not exists reject_reason text;
alter table public.mall_builder_store_customers add column if not exists applied_at timestamptz;
alter table public.mall_builder_store_customers add column if not exists reviewed_at timestamptz;

-- 기존 손님은 일반 등급
update public.mall_builder_store_customers c set grade_id = g.id
  from public.mall_builder_customer_grades g
  where g.store_id = c.store_id and g.code = 'consumer' and c.grade_id is null;

create or replace function public.mall_builder_store_customers_protect()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' then
    new.grade_id := (select g.id from public.mall_builder_customer_grades g where g.store_id = new.store_id and g.code = 'consumer');
    new.kind := 'consumer';
    new.approval_status := 'none';
    new.business_no := null; new.company := null; new.ceo_name := null; new.cert_path := null;
    new.reject_reason := null; new.applied_at := null; new.reviewed_at := null;
  else
    new.grade_id := old.grade_id; new.kind := old.kind; new.approval_status := old.approval_status;
    new.business_no := old.business_no; new.company := old.company; new.ceo_name := old.ceo_name; new.cert_path := old.cert_path;
    new.reject_reason := old.reject_reason; new.applied_at := old.applied_at; new.reviewed_at := old.reviewed_at;
  end if;
  return new;
end;
$$;
create trigger mall_builder_store_customers_protect before insert or update on public.mall_builder_store_customers
  for each row execute function public.mall_builder_store_customers_protect();

-- 사업자등록증: 비공개 버킷. 경로 = <store_id>/<user_id>/파일. 올리기·보기는 본인, 보기는 그 몰 운영자도(서명 주소)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mall-builder-private', 'mall-builder-private', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "mall_builder_private_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'mall-builder-private'
    and (storage.foldername(objects.name))[2] = (select auth.uid())::text
    and exists (select 1 from public.mall_builder_store_customers c
      where c.store_id::text = (storage.foldername(objects.name))[1] and c.user_id = (select auth.uid()))
  );
-- 주의: 손님 표에도 name(손님 이름) 칸이 있어 objects.name으로 적어야 한다. 처음엔 name만 적어 본인 폴더도 막혔고
-- alter policy로 고쳤다(mall_builder_0010b_private_insert_fix, 2026-11-03).
create policy "mall_builder_private_read" on storage.objects
  for select to authenticated using (
    bucket_id = 'mall-builder-private'
    and ((storage.foldername(name))[2] = (select auth.uid())::text
      or public.mall_builder_is_store_staff(((storage.foldername(name))[1])::uuid))
  );

-- 사업자 신청(손님 본인). 승인 대기·승인 상태면 다시 낼 수 없다. 반려됐으면 다시 낼 수 있다
create or replace function public.mall_builder_apply_business(
  p_store_id uuid, p_business_no text, p_company text, p_ceo_name text, p_cert_path text
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_c public.mall_builder_store_customers%rowtype;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into v_c from public.mall_builder_store_customers c where c.store_id = p_store_id and c.user_id = v_uid for update;
  if not found then raise exception '이 몰에 가입한 뒤 신청할 수 있습니다.'; end if;
  if v_c.approval_status in ('pending', 'approved') then raise exception '이미 % 상태입니다.', case v_c.approval_status when 'pending' then '승인 대기' else '사업자 회원' end; end if;
  if coalesce(p_business_no, '') !~ '^[0-9]{3}-[0-9]{2}-[0-9]{5}$' then raise exception '사업자등록번호를 확인해 주세요.'; end if;
  if char_length(btrim(coalesce(p_company, ''))) not between 1 and 60 then raise exception '상호를 1~60자로 입력해 주세요.'; end if;
  if char_length(btrim(coalesce(p_ceo_name, ''))) not between 1 and 30 then raise exception '대표자 이름을 1~30자로 입력해 주세요.'; end if;
  if coalesce(p_cert_path, '') not like p_store_id::text || '/' || v_uid::text || '/%'
     or not exists (select 1 from storage.objects o where o.bucket_id = 'mall-builder-private' and o.name = p_cert_path) then
    raise exception '사업자등록증 파일을 올려 주세요.';
  end if;
  update public.mall_builder_store_customers set
    approval_status = 'pending', business_no = p_business_no, company = btrim(p_company), ceo_name = btrim(p_ceo_name),
    cert_path = p_cert_path, reject_reason = null, applied_at = now(), reviewed_at = null
  where id = v_c.id;
  return 'pending';
end;
$$;

-- 사업자 심사(그 몰 운영자). 승인 → 사업자 등급, 반려 → 사유(손님에게 보임)
create or replace function public.mall_builder_review_business(p_customer_id uuid, p_approve boolean, p_reason text default '')
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_c public.mall_builder_store_customers%rowtype;
  v_grade uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into v_c from public.mall_builder_store_customers c where c.id = p_customer_id for update;
  if not found or not public.mall_builder_is_store_staff(v_c.store_id) then raise exception '이 손님을 심사할 권한이 없습니다.'; end if;
  if v_c.approval_status <> 'pending' then raise exception '승인 대기 중인 신청만 심사할 수 있습니다.'; end if;
  if p_approve then
    select g.id into v_grade from public.mall_builder_customer_grades g where g.store_id = v_c.store_id and g.code = 'business';
    update public.mall_builder_store_customers set approval_status = 'approved', kind = 'business', grade_id = v_grade, reject_reason = null, reviewed_at = now()
      where id = v_c.id;
    return 'approved';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 1 and 200 then raise exception '반려 사유를 1~200자로 입력해 주세요.'; end if;
  update public.mall_builder_store_customers set approval_status = 'rejected', reject_reason = btrim(p_reason), reviewed_at = now()
    where id = v_c.id;
  return 'rejected';
end;
$$;
