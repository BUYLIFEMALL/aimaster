-- AI 쇼핑몰 빌더 M1-4 — 리셀러 신청·본사 승인 + 정산 계좌 1회 인증 (2026-11-14 마스터 플랜 §4 M1-4, 결정 「신청 후 본사 승인」)
-- 재사용: 리셀러 표·장부·출금(D33 0052), 신청 흐름은 공급사 입점 신청(0070)과 같은 모양, 서류는 회원 본인 폴더 규칙(0010)으로 올림.
-- D33 rate는 「본사가 정하는 리셀러별 추가 수수료율」(프로셀 리셀러 수수료)로 쓰고 0%를 허용한다(상품 수수료는 0068 상품별 리셀러율).
-- 추가·함수 일부 바꾸기만(표·데이터 drop 없음 — rate 제약만 0 이상으로 바꿈).

-- 1. 리셀러 율 0% 허용 + 정산 정보 칸
alter table public.mall_builder_resellers drop constraint if exists mall_builder_resellers_rate_check;
do $c$
begin
  if not exists (select 1 from pg_constraint where conname = 'mall_builder_resellers_rate_range') then
    alter table public.mall_builder_resellers add constraint mall_builder_resellers_rate_range check (rate >= 0 and rate <= 50);
  end if;
end $c$;
alter table public.mall_builder_resellers add column if not exists payee_type text not null default 'individual';
alter table public.mall_builder_resellers add column if not exists biz_no text not null default '';
alter table public.mall_builder_resellers add column if not exists bank_name text not null default '';
alter table public.mall_builder_resellers add column if not exists bank_account text not null default '';
alter table public.mall_builder_resellers add column if not exists bank_holder text not null default '';
alter table public.mall_builder_resellers add column if not exists bankbook_path text;
alter table public.mall_builder_resellers add column if not exists doc_path text;
alter table public.mall_builder_resellers add column if not exists channel text not null default '';
alter table public.mall_builder_resellers add column if not exists approved_at timestamptz;
do $c$
begin
  if not exists (select 1 from pg_constraint where conname = 'mall_builder_resellers_payee_chk') then
    alter table public.mall_builder_resellers add constraint mall_builder_resellers_payee_chk check (payee_type in ('individual', 'business'));
  end if;
end $c$;

create or replace function pg_temp.swap(src text, a text, b text, what text) returns text language plpgsql as $f$
begin
  if (char_length(src) - char_length(replace(src, a, ''))) / char_length(a) <> 1 then raise exception '문구를 1번 찾지 못함: %', what; end if;
  return replace(src, a, b);
end $f$;
do $m$
declare src text;
begin
  src := pg_get_functiondef('public.mall_builder_reseller_set(uuid,uuid,text,numeric,boolean)'::regprocedure);
  src := pg_temp.swap(src, 'if p_rate is null or p_rate <= 0 or p_rate > 50 then raise exception ''수수료율은 0보다 크고 50%% 이하로 입력해 주세요.''; end if;',
                           'if p_rate is null or p_rate < 0 or p_rate > 50 then raise exception ''리셀러 추가 수수료율은 0~50%% 사이로 입력해 주세요.''; end if;', '리셀러 율');
  execute src;
end $m$;

-- 2. 신청 표
create table if not exists public.mall_builder_reseller_applications (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_id uuid not null references public.mall_builder_store_customers (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  phone text not null default '' check (char_length(phone) <= 30),
  channel text not null check (char_length(channel) between 1 and 300),
  intro text not null default '' check (char_length(intro) <= 1000),
  payee_type text not null check (payee_type in ('individual', 'business')),
  biz_no text not null default '' check (char_length(biz_no) <= 20),
  bank_name text not null check (char_length(bank_name) between 1 and 30),
  bank_account text not null check (char_length(bank_account) between 5 and 40),
  bank_holder text not null check (char_length(bank_holder) between 1 and 30),
  bankbook_path text not null,
  doc_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  note text not null default '' check (char_length(note) <= 300),
  reseller_id uuid references public.mall_builder_resellers (id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid
);
create index if not exists mall_builder_reseller_applications_store on public.mall_builder_reseller_applications (store_id, status, created_at desc);
create unique index if not exists mall_builder_reseller_applications_one_pending
  on public.mall_builder_reseller_applications (store_id, user_id) where status = 'pending';
alter table public.mall_builder_reseller_applications enable row level security;
drop policy if exists mall_builder_reseller_applications_read on public.mall_builder_reseller_applications;
create policy mall_builder_reseller_applications_read on public.mall_builder_reseller_applications for select
  using (user_id = (select auth.uid()) or public.mall_builder_staff_can(store_id, 'customers'));

-- 3. 함수
-- 몰 대표: 리셀러 신청 받기 켜기/끄기(modules.reseller_apply)
create or replace function public.mall_builder_reseller_apply_open(p_store_id uuid, p_open boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.mall_builder_staff_can(p_store_id, 'owner') then raise exception '몰 대표만 바꿀 수 있습니다.'; end if;
  update public.mall_builder_stores set modules = coalesce(modules, '{}'::jsonb) || jsonb_build_object('reseller_apply', coalesce(p_open, false)), updated_at = now()
   where id = p_store_id;
end;
$$;

-- 이 몰 회원: 리셀러 신청. p = {name, phone, channel, intro, payee_type, biz_no, bank_name, bank_account, bank_holder, bankbook_path, doc_path}
create or replace function public.mall_builder_reseller_apply(p_store_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  st public.mall_builder_stores%rowtype;
  v_uid uuid := auth.uid();
  v_cust uuid;
  v_type text := coalesce(p ->> 'payee_type', 'individual');
  v_biz text := regexp_replace(coalesce(p ->> 'biz_no', ''), '[^0-9]', '', 'g');
  v_book text := nullif(btrim(coalesce(p ->> 'bankbook_path', '')), '');
  v_doc text := nullif(btrim(coalesce(p ->> 'doc_path', '')), '');
  v_prefix text;
  v_id uuid;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into st from public.mall_builder_stores s where s.id = p_store_id;
  if st.id is null or st.status <> 'active' or coalesce((st.modules ->> 'reseller_apply')::boolean, false) is not true then
    raise exception '지금은 이 몰에서 리셀러 신청을 받지 않습니다.';
  end if;
  select c.id into v_cust from public.mall_builder_store_customers c where c.store_id = p_store_id and c.user_id = v_uid;
  if v_cust is null then raise exception '먼저 이 몰에 회원가입해 주세요.'; end if;
  if exists (select 1 from public.mall_builder_resellers r where r.customer_id = v_cust and r.active) then raise exception '이미 이 몰의 리셀러입니다.'; end if;
  if exists (select 1 from public.mall_builder_reseller_applications a where a.store_id = p_store_id and a.user_id = v_uid and a.status = 'pending') then
    raise exception '이미 신청해 승인을 기다리는 중입니다.';
  end if;
  if char_length(btrim(coalesce(p ->> 'name', ''))) not between 1 and 30 then raise exception '이름을 적어 주세요.'; end if;
  if char_length(btrim(coalesce(p ->> 'channel', ''))) not between 1 and 300 then raise exception '홍보할 채널(블로그·인스타 등 주소)을 적어 주세요.'; end if;
  if v_type not in ('individual', 'business') then raise exception '개인·사업자 구분을 골라 주세요.'; end if;
  if v_type = 'business' and char_length(v_biz) <> 10 then raise exception '사업자등록번호 10자리를 적어 주세요.'; end if;
  if char_length(btrim(coalesce(p ->> 'bank_name', ''))) not between 1 and 30 or char_length(btrim(coalesce(p ->> 'bank_account', ''))) not between 5 and 40
     or char_length(btrim(coalesce(p ->> 'bank_holder', ''))) not between 1 and 30 then raise exception '정산받을 은행·계좌번호·예금주를 적어 주세요.'; end if;
  v_prefix := p_store_id::text || '/' || v_uid::text || '/reseller-apply-';
  if v_book is null or v_book not like v_prefix || '%' then raise exception '통장 사본을 올려 주세요.'; end if;
  if v_type = 'business' and (v_doc is null or v_doc not like v_prefix || '%') then raise exception '사업자등록증을 올려 주세요.'; end if;
  if v_doc is not null and v_doc not like v_prefix || '%' then raise exception '증빙 서류를 다시 올려 주세요.'; end if;
  insert into public.mall_builder_reseller_applications (store_id, user_id, customer_id, name, phone, channel, intro, payee_type, biz_no,
                                                         bank_name, bank_account, bank_holder, bankbook_path, doc_path)
  values (p_store_id, v_uid, v_cust, btrim(p ->> 'name'), left(btrim(coalesce(p ->> 'phone', '')), 30), btrim(p ->> 'channel'),
          left(btrim(coalesce(p ->> 'intro', '')), 1000), v_type, case when v_type = 'business' then v_biz else '' end,
          btrim(p ->> 'bank_name'), btrim(p ->> 'bank_account'), btrim(p ->> 'bank_holder'), v_book, v_doc)
  returning id into v_id;
  return v_id;
end;
$$;

-- 신청자: 대기 중 신청 취소
create or replace function public.mall_builder_reseller_apply_cancel(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.mall_builder_reseller_applications set status = 'cancelled', decided_at = now()
   where id = p_id and user_id = auth.uid() and status = 'pending';
  if not found then raise exception '취소할 수 있는 신청이 없습니다.'; end if;
end;
$$;

-- 몰 대표: 승인(코드 자동·추가 수수료율 선택·정산 계좌 저장) / 반려(사유 필수)
create or replace function public.mall_builder_reseller_apply_decide(p_id uuid, p_action text, p_note text, p_rate numeric)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  a public.mall_builder_reseller_applications%rowtype;
  v_note text := left(btrim(coalesce(p_note, '')), 300);
  v_code text;
  v_rid uuid;
  i int := 0;
begin
  select * into a from public.mall_builder_reseller_applications x where x.id = p_id for update;
  if a.id is null or auth.uid() is null or not public.mall_builder_staff_can(a.store_id, 'owner') then raise exception '신청을 찾을 수 없습니다.'; end if;
  if a.status <> 'pending' then raise exception '대기 중인 신청만 처리할 수 있습니다.'; end if;
  if p_action = 'reject' then
    if v_note = '' then raise exception '반려 사유를 적어 주세요(신청자에게 보입니다).'; end if;
    update public.mall_builder_reseller_applications set status = 'rejected', note = v_note, decided_at = now(), decided_by = auth.uid() where id = a.id;
    perform mall_builder_private.staff_log(a.store_id, 'reseller_apply_reject', 'reseller_application', a.id::text, a.name);
    return null;
  end if;
  if p_action <> 'approve' then raise exception '알 수 없는 처리입니다.'; end if;
  if p_rate is not null and (p_rate < 0 or p_rate > 50) then raise exception '리셀러 추가 수수료율은 0~50%% 사이로 적어 주세요.'; end if;
  -- 이미 D33로 지정된 리셀러면 코드는 그대로 두고 정산 정보만 채운다
  select r.code into v_code from public.mall_builder_resellers r where r.customer_id = a.customer_id;
  while v_code is null loop
    v_code := upper(substr(translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/=0O1Il', ''), 1, 6));
    if char_length(v_code) < 6 or exists (select 1 from public.mall_builder_resellers r where r.store_id = a.store_id and r.code = v_code) then v_code := null; end if;
    i := i + 1;
    if i > 20 then raise exception '리셀러 코드를 만들지 못했습니다. 다시 시도해 주세요.'; end if;
  end loop;
  insert into public.mall_builder_resellers (store_id, customer_id, code, rate, active, payee_type, biz_no, bank_name, bank_account, bank_holder,
                                             bankbook_path, doc_path, channel, approved_at)
  values (a.store_id, a.customer_id, v_code, round(coalesce(p_rate, 0), 2), true, a.payee_type, a.biz_no, a.bank_name, a.bank_account, a.bank_holder,
          a.bankbook_path, a.doc_path, a.channel, now())
  on conflict (customer_id) do update set active = true, rate = coalesce(round(p_rate, 2), public.mall_builder_resellers.rate), payee_type = excluded.payee_type,
     biz_no = excluded.biz_no, bank_name = excluded.bank_name, bank_account = excluded.bank_account, bank_holder = excluded.bank_holder,
     bankbook_path = excluded.bankbook_path, doc_path = excluded.doc_path, channel = excluded.channel, approved_at = now(), updated_at = now()
  returning id into v_rid;
  update public.mall_builder_reseller_applications set status = 'approved', note = v_note, reseller_id = v_rid, decided_at = now(), decided_by = auth.uid() where id = a.id;
  perform mall_builder_private.staff_log(a.store_id, 'reseller_apply_approve', 'reseller_application', a.id::text, a.name);
  return v_rid;
end;
$$;

revoke all on function public.mall_builder_reseller_apply_open(uuid, boolean) from public, anon;
revoke all on function public.mall_builder_reseller_apply(uuid, jsonb) from public, anon;
revoke all on function public.mall_builder_reseller_apply_cancel(uuid) from public, anon;
revoke all on function public.mall_builder_reseller_apply_decide(uuid, text, text, numeric) from public, anon;
grant execute on function public.mall_builder_reseller_apply_open(uuid, boolean) to authenticated;
grant execute on function public.mall_builder_reseller_apply(uuid, jsonb) to authenticated;
grant execute on function public.mall_builder_reseller_apply_cancel(uuid) to authenticated;
grant execute on function public.mall_builder_reseller_apply_decide(uuid, text, text, numeric) to authenticated;
