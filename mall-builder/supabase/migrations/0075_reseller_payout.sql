-- AI 쇼핑몰 빌더 M1-7 — 리셀러 출금: 몰별 최소 금액 · 공제금액(부가세·원천징수) · 이체금액 · 저장 계좌 (2026-11-15 마스터 플랜 §4 M1-7)
-- 재사용: 출금 표·장부(D33 0052), 승인 때 저장한 정산 계좌·정산 방식(0071). 출금 신청 때 잔고에서 신청 금액 전부가 빠지고(지금과 같음),
-- 지급 처리 때 운영자가 공제금액을 적으면 이체금액 = 신청 금액 − 공제금액(실제 송금액)을 남긴다. 반려는 지금처럼 잔고로 돌려줌.
-- 추가·함수 교체만(drop 없음).

-- 1. 칸
alter table public.mall_builder_stores add column if not exists reseller_payout_min bigint not null default 10000;
do $c$
begin
  if not exists (select 1 from pg_constraint where conname = 'mall_builder_stores_reseller_payout_min_chk') then
    alter table public.mall_builder_stores add constraint mall_builder_stores_reseller_payout_min_chk check (reseller_payout_min between 1000 and 10000000);
  end if;
end $c$;
alter table public.mall_builder_reseller_payouts add column if not exists payee_type text not null default 'individual';
alter table public.mall_builder_reseller_payouts add column if not exists deduction bigint not null default 0;
alter table public.mall_builder_reseller_payouts add column if not exists transfer_amount bigint;
do $c$
begin
  if not exists (select 1 from pg_constraint where conname = 'mall_builder_reseller_payouts_deduction_chk') then
    alter table public.mall_builder_reseller_payouts add constraint mall_builder_reseller_payouts_deduction_chk check (deduction >= 0 and deduction <= amount);
  end if;
end $c$;

-- 2. 몰 대표: 최소 출금 금액
create or replace function public.mall_builder_reseller_payout_min_set(p_store_id uuid, p_amount bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not coalesce(public.mall_builder_staff_can(p_store_id, 'owner'), false) then raise exception '몰 대표만 바꿀 수 있습니다.'; end if;
  if p_amount is null or p_amount < 1000 or p_amount > 10000000 then raise exception '최소 출금 금액은 1,000원 ~ 1,000만 원 사이로 적어 주세요.'; end if;
  update public.mall_builder_stores set reseller_payout_min = p_amount, updated_at = now() where id = p_store_id;
end;
$$;
revoke all on function public.mall_builder_reseller_payout_min_set(uuid, bigint) from public, anon;
grant execute on function public.mall_builder_reseller_payout_min_set(uuid, bigint) to authenticated;

-- 3. 리셀러 본인: 출금 신청(0052 교체) — 몰 최소 금액, 계좌 칸을 비우면 저장 계좌 사용, 정산 방식 남김
create or replace function public.mall_builder_reseller_request_payout(p_store_id uuid, p_amount bigint, p_bank_name text, p_bank_account text, p_bank_holder text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  r public.mall_builder_resellers%rowtype;
  v_bal bigint;
  v_min bigint;
  v_id uuid;
  v_bank text := btrim(coalesce(p_bank_name, ''));
  v_acct text := btrim(coalesce(p_bank_account, ''));
  v_holder text := btrim(coalesce(p_bank_holder, ''));
begin
  select rs.* into r from public.mall_builder_resellers rs join public.mall_builder_store_customers c on c.id = rs.customer_id
   where rs.store_id = p_store_id and c.user_id = auth.uid();
  if r.id is null then raise exception '리셀러만 출금을 신청할 수 있습니다.'; end if;
  if not r.active then raise exception '쉬는 중인 리셀러는 출금을 신청할 수 없습니다. 몰 운영자에게 문의해 주세요.'; end if;
  perform pg_advisory_xact_lock(hashtext('mall_builder_reseller:' || r.id::text));
  if exists (select 1 from public.mall_builder_reseller_payouts p where p.reseller_id = r.id and p.status = 'requested') then
    raise exception '처리 대기 중인 출금 신청이 있습니다. 처리된 뒤 다시 신청해 주세요.';
  end if;
  select coalesce(s.reseller_payout_min, 10000) into v_min from public.mall_builder_stores s where s.id = p_store_id;
  select coalesce(sum(amount), 0) into v_bal from public.mall_builder_reseller_ledger where reseller_id = r.id;
  if p_amount is null or p_amount < v_min then raise exception '출금은 %원 이상부터 신청할 수 있습니다.', to_char(v_min, 'FM999,999,999,990'); end if;
  if p_amount > v_bal then raise exception '출금 가능 금액(%원)보다 많습니다.', to_char(v_bal, 'FM999,999,999,990'); end if;
  if v_bank = '' and v_acct = '' and v_holder = '' then
    v_bank := r.bank_name; v_acct := r.bank_account; v_holder := r.bank_holder;
  end if;
  if char_length(v_bank) not between 1 and 30 or char_length(v_acct) not between 5 and 40 or char_length(v_holder) not between 1 and 30 then
    raise exception '은행·계좌번호·예금주를 입력해 주세요.';
  end if;
  insert into public.mall_builder_reseller_payouts (store_id, reseller_id, amount, bank_name, bank_account, bank_holder, payee_type)
  values (p_store_id, r.id, p_amount, v_bank, v_acct, v_holder, coalesce(nullif(r.payee_type, ''), 'individual')) returning id into v_id;
  perform mall_builder_private.reseller_add(p_store_id, r.id, null, v_id, 'payout', -p_amount, '출금 신청');
  return v_id;
end $$;

-- 4. 운영자(「손님」 권한): 지급 완료 — 공제금액·비고를 적으면 이체금액을 남김(0052의 'paid'는 공제 0으로 같은 함수 사용)
create or replace function public.mall_builder_reseller_payout_pay(p_id uuid, p_deduction bigint, p_memo text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  p public.mall_builder_reseller_payouts%rowtype;
  v_ded bigint := coalesce(p_deduction, 0);
begin
  select * into p from public.mall_builder_reseller_payouts x where x.id = p_id for update;
  if p.id is null or auth.uid() is null or not coalesce(public.mall_builder_staff_can(p.store_id, 'customers'), false) then raise exception '출금 신청을 찾을 수 없습니다.'; end if;
  if p.status <> 'requested' then raise exception '이미 처리한 신청입니다.'; end if;
  if v_ded < 0 or v_ded > p.amount then raise exception '공제금액은 0원 ~ 신청 금액 사이로 적어 주세요.'; end if;
  update public.mall_builder_reseller_payouts
     set status = 'paid', deduction = v_ded, transfer_amount = p.amount - v_ded, decided_at = now(), decided_by = auth.uid(),
         reason = nullif(left(btrim(coalesce(p_memo, '')), 200), '')
   where id = p_id;
  perform mall_builder_private.staff_log(p.store_id, 'reseller_payout_paid', 'reseller_payout', p.id::text, (p.amount - v_ded)::text);
  return p.amount - v_ded;
end;
$$;
revoke all on function public.mall_builder_reseller_payout_pay(uuid, bigint, text) from public, anon;
grant execute on function public.mall_builder_reseller_payout_pay(uuid, bigint, text) to authenticated;

-- 옛 지급 완료(0052 'paid')도 이체금액을 남기게: 반려는 그대로
create or replace function public.mall_builder_reseller_decide_payout(p_id uuid, p_action text, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.mall_builder_reseller_payouts%rowtype;
begin
  if p_action = 'paid' then
    perform public.mall_builder_reseller_payout_pay(p_id, 0, p_reason);
    return;
  end if;
  select * into p from public.mall_builder_reseller_payouts where id = p_id for update;
  if p.id is null or not coalesce(public.mall_builder_staff_can(p.store_id, 'customers'), false) then raise exception '출금 신청을 찾을 수 없습니다.'; end if;
  if p.status <> 'requested' then raise exception '이미 처리한 신청입니다.'; end if;
  if p_action = 'rejected' then
    if char_length(btrim(coalesce(p_reason, ''))) < 2 then raise exception '반려 사유를 적어 주세요.'; end if;
    update public.mall_builder_reseller_payouts set status = 'rejected', decided_at = now(), decided_by = auth.uid(), reason = left(btrim(p_reason), 200) where id = p_id;
    perform mall_builder_private.reseller_add(p.store_id, p.reseller_id, null, p.id, 'payout_cancel', p.amount, '출금 반려 — 돌려줌');
  else
    raise exception '알 수 없는 처리입니다.';
  end if;
end $$;

-- 5. 리셀러 요약(0052 교체): 최소 출금 금액·저장 계좌 유무·지급 예정 리워드(0074) 추가
create or replace function public.mall_builder_reseller_my_summary(p_store_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', r.id, 'code', r.code, 'rate', r.rate, 'active', r.active,
    'linked', (select count(*) from public.mall_builder_store_customers c2 where c2.reseller_id = r.id),
    'balance', coalesce((select sum(l.amount) from public.mall_builder_reseller_ledger l where l.reseller_id = r.id), 0),
    'month_earned', coalesce((select sum(l.amount) from public.mall_builder_reseller_ledger l where l.reseller_id = r.id and l.kind in ('earn', 'reclaim')
                               and l.created_at >= date_trunc('month', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'), 0),
    'pending', coalesce((select sum(p.amount) from public.mall_builder_reseller_payouts p where p.reseller_id = r.id and p.status = 'requested'), 0),
    'scheduled', coalesce((select sum(w.amount) from public.mall_builder_reseller_rewards w where w.reseller_id = r.id and w.status = 'pending'), 0),
    'payout_min', coalesce(s.reseller_payout_min, 10000),
    'payee_type', r.payee_type,
    'saved_bank', case when r.bank_account <> '' then r.bank_name || ' ' || left(r.bank_account, 3) || '****' || right(r.bank_account, 2) || ' (' || r.bank_holder || ')' end
  )
  from public.mall_builder_resellers r
  join public.mall_builder_store_customers c on c.id = r.customer_id
  join public.mall_builder_stores s on s.id = r.store_id
  where r.store_id = p_store_id and c.user_id = auth.uid();
$$;
