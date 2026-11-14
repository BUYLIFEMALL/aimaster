-- AI 쇼핑몰 빌더 M1-0 — 공급사 입점 신청(스스로 가입·신청 → 본사 승인) (2026-11-14 마스터 플랜 §4 M1-0)
-- 주인님: 「공급사가 가입 후 상품을 등록하고 …」 — 지금은 운영자 초대(0053)만 있었다. 초대는 그대로 두고 신청 경로를 더한다.
-- 재사용: 신청·승인 흐름은 분양 신청(0061)과 같은 모양, 사업자등록증은 비공개 저장소(0010) `<몰>/<본인>/…` 경로,
--         승인 결과는 초대 수락(0053b)과 같다(공급사 줄 active + 본인 연결). 승인 때 공급사별 본사율(0068)을 함께 정할 수 있다.
-- 추가만(drop 없음).

-- 1. 신청 표
create table if not exists public.mall_builder_supplier_applications (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  company text not null check (char_length(company) between 1 and 60),
  biz_no text not null check (char_length(biz_no) between 10 and 20),
  ceo_name text not null default '' check (char_length(ceo_name) <= 30),
  contact_name text not null default '' check (char_length(contact_name) <= 30),
  phone text not null default '' check (char_length(phone) <= 30),
  category text not null default '' check (char_length(category) <= 60),
  intro text not null default '' check (char_length(intro) <= 1000),
  cert_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  note text not null default '' check (char_length(note) <= 300),
  supplier_id uuid references public.mall_builder_suppliers (id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid
);
create index if not exists mall_builder_supplier_applications_store on public.mall_builder_supplier_applications (store_id, status, created_at desc);
create unique index if not exists mall_builder_supplier_applications_one_pending
  on public.mall_builder_supplier_applications (store_id, user_id) where status = 'pending';
alter table public.mall_builder_supplier_applications enable row level security;
-- 읽기: 신청자 본인, 상품 권한 운영자. 쓰기는 함수로만
drop policy if exists mall_builder_supplier_applications_read on public.mall_builder_supplier_applications;
create policy mall_builder_supplier_applications_read on public.mall_builder_supplier_applications for select
  using (user_id = (select auth.uid()) or public.mall_builder_staff_can(store_id, 'products'));

-- 2. 사업자등록증: 손님이 아니어도 신청자 본인 폴더 `<몰>/<본인>/supplier-apply-…` 에 올릴 수 있게(읽기 규칙은 0010 그대로 — 본인·운영자)
drop policy if exists "mall_builder_private_insert_supplier_apply" on storage.objects;
create policy "mall_builder_private_insert_supplier_apply" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'mall-builder-private'
    and (storage.foldername(objects.name))[2] = (select auth.uid())::text
    and objects.name like '%/' || (select auth.uid())::text || '/supplier-apply-%'
    and exists (select 1 from public.mall_builder_stores s where s.id::text = (storage.foldername(objects.name))[1] and s.status = 'active')
  );

-- 3. 함수
-- 몰 대표: 입점 신청 받기 켜기/끄기(modules.supplier_apply)
create or replace function public.mall_builder_supplier_apply_open(p_store_id uuid, p_open boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.mall_builder_staff_can(p_store_id, 'owner') then raise exception '몰 대표만 바꿀 수 있습니다.'; end if;
  update public.mall_builder_stores set modules = coalesce(modules, '{}'::jsonb) || jsonb_build_object('supplier_apply', coalesce(p_open, false)), updated_at = now()
   where id = p_store_id;
end;
$$;

-- 로그인 회원: 입점 신청. p = {company, biz_no, ceo_name, contact_name, phone, category, intro, cert_path}
create or replace function public.mall_builder_supplier_apply(p_store_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  st public.mall_builder_stores%rowtype;
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_biz text := regexp_replace(coalesce(p ->> 'biz_no', ''), '[^0-9]', '', 'g');
  v_cert text := nullif(btrim(coalesce(p ->> 'cert_path', '')), '');
  v_id uuid;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into st from public.mall_builder_stores s where s.id = p_store_id;
  if st.id is null or st.status <> 'active' or coalesce((st.modules ->> 'supplier_apply')::boolean, false) is not true then
    raise exception '지금은 이 몰에서 입점 신청을 받지 않습니다.';
  end if;
  if public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰의 운영자 계정은 공급사로 입점할 수 없습니다.'; end if;
  if exists (select 1 from public.mall_builder_suppliers x where x.store_id = p_store_id and x.user_id = v_uid and x.status <> 'revoked') then
    raise exception '이미 이 몰의 공급사입니다. 공급사 화면을 이용해 주세요.';
  end if;
  if exists (select 1 from public.mall_builder_supplier_applications a where a.store_id = p_store_id and a.user_id = v_uid and a.status = 'pending') then
    raise exception '이미 신청해 승인을 기다리는 중입니다.';
  end if;
  if char_length(btrim(coalesce(p ->> 'company', ''))) not between 1 and 60 then raise exception '회사(상호) 이름을 1~60자로 적어 주세요.'; end if;
  if char_length(v_biz) <> 10 then raise exception '사업자등록번호 10자리를 적어 주세요.'; end if;
  if v_cert is null or v_cert not like p_store_id::text || '/' || v_uid::text || '/supplier-apply-%' then raise exception '사업자등록증 파일을 올려 주세요.'; end if;
  insert into public.mall_builder_supplier_applications (store_id, user_id, email, company, biz_no, ceo_name, contact_name, phone, category, intro, cert_path)
  values (p_store_id, v_uid, v_email, btrim(p ->> 'company'), v_biz,
          left(btrim(coalesce(p ->> 'ceo_name', '')), 30), left(btrim(coalesce(p ->> 'contact_name', '')), 30), left(btrim(coalesce(p ->> 'phone', '')), 30),
          left(btrim(coalesce(p ->> 'category', '')), 60), left(btrim(coalesce(p ->> 'intro', '')), 1000), v_cert)
  returning id into v_id;
  return v_id;
end;
$$;

-- 신청자: 대기 중 신청 취소
create or replace function public.mall_builder_supplier_apply_cancel(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.mall_builder_supplier_applications set status = 'cancelled', decided_at = now()
   where id = p_id and user_id = auth.uid() and status = 'pending';
  if not found then raise exception '취소할 수 있는 신청이 없습니다.'; end if;
end;
$$;

-- 몰 대표: 승인(공급사 줄 active + 본인 연결 + 본사율 선택) / 반려(사유 필수)
create or replace function public.mall_builder_supplier_apply_decide(p_id uuid, p_action text, p_note text, p_hq_rate numeric)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  a public.mall_builder_supplier_applications%rowtype;
  v_note text := left(btrim(coalesce(p_note, '')), 300);
  v_sid uuid;
begin
  select * into a from public.mall_builder_supplier_applications x where x.id = p_id for update;
  if a.id is null or auth.uid() is null or not public.mall_builder_staff_can(a.store_id, 'owner') then raise exception '신청을 찾을 수 없습니다.'; end if;
  if a.status <> 'pending' then raise exception '대기 중인 신청만 처리할 수 있습니다.'; end if;
  if p_action = 'reject' then
    if v_note = '' then raise exception '반려 사유를 적어 주세요(신청자에게 보입니다).'; end if;
    update public.mall_builder_supplier_applications set status = 'rejected', note = v_note, decided_at = now(), decided_by = auth.uid() where id = a.id;
    perform mall_builder_private.staff_log(a.store_id, 'supplier_apply_reject', 'supplier_application', a.id::text, a.company);
    return null;
  end if;
  if p_action <> 'approve' then raise exception '알 수 없는 처리입니다.'; end if;
  if p_hq_rate is not null and (p_hq_rate < 0 or p_hq_rate > 50) then raise exception '본사 판매수수료율은 0~50%% 사이로 적어 주세요.'; end if;
  if exists (select 1 from public.mall_builder_suppliers x where x.store_id = a.store_id and x.user_id = a.user_id and x.status <> 'revoked') then
    raise exception '이 신청자는 이미 이 몰의 공급사입니다.';
  end if;
  if (select count(*) from public.mall_builder_suppliers s where s.store_id = a.store_id and s.status <> 'revoked') >= 200 then
    raise exception '공급사는 몰 하나에 200곳까지 둘 수 있습니다.';
  end if;
  insert into public.mall_builder_suppliers (store_id, user_id, name, email, biz_no, contact_name, phone, memo, status, accepted_at, invited_by, hq_fee_rate)
  values (a.store_id, a.user_id, a.company, a.email, a.biz_no, coalesce(nullif(a.contact_name, ''), a.ceo_name), a.phone,
          left('입점 신청: ' || a.category || case when a.intro <> '' then ' · ' || a.intro else '' end, 300), 'active', now(), auth.uid(), round(p_hq_rate, 2))
  returning id into v_sid;
  update public.mall_builder_supplier_applications set status = 'approved', note = v_note, supplier_id = v_sid, decided_at = now(), decided_by = auth.uid() where id = a.id;
  perform mall_builder_private.staff_log(a.store_id, 'supplier_apply_approve', 'supplier_application', a.id::text, a.company);
  return v_sid;
end;
$$;

revoke all on function public.mall_builder_supplier_apply_open(uuid, boolean) from public, anon;
revoke all on function public.mall_builder_supplier_apply(uuid, jsonb) from public, anon;
revoke all on function public.mall_builder_supplier_apply_cancel(uuid) from public, anon;
revoke all on function public.mall_builder_supplier_apply_decide(uuid, text, text, numeric) from public, anon;
grant execute on function public.mall_builder_supplier_apply_open(uuid, boolean) to authenticated;
grant execute on function public.mall_builder_supplier_apply(uuid, jsonb) to authenticated;
grant execute on function public.mall_builder_supplier_apply_cancel(uuid) to authenticated;
grant execute on function public.mall_builder_supplier_apply_decide(uuid, text, text, numeric) to authenticated;
