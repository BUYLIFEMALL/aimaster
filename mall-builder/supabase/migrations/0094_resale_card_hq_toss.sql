-- AI 쇼핑몰 빌더 M5-2 — 분양몰 카드 결제 = 본사 토스 (2026-11-15 docs/PLAN_20261115_M5_DOMAIN_PAYMENT.md §6)
-- 백엔드 DB 번호 0090~0099(상호 인수인계 §2).
-- 결정 5(T2): 분양몰 결제는 본사 계좌·본사 토스. 지금까지는 분양몰 주문서·결제·승인·환불이 분양몰 자신의 키를 읽어 돈이 분양자 토스로 갈 수 있었고,
-- 유저 카드 승인의 「결제 완료」 변경을 분양몰 보호 트리거가 막아 승인만 되고 주문은 입금 대기로 남았다(운영 분양몰 0개라 피해 없음).
-- 1) 분양몰의 결제 설정(공개 클라이언트 키·켜짐)과 토스 시크릿 칸을 본사 값으로 자동 복사(입금 계좌 복사와 같은 방식).
--    → 기존 주문서·결제창·승인·조회·취소·환불 함수를 고치지 않고도 모두 본사 키로 동작. 분양자는 이 값을 바꾸지 못함.
-- 2) 분양몰 보호 트리거: 카드 결제가 「완료」로 기록된 주문의 입금 대기 → 결제 완료만 유저도 통과(→ 기존 전달 주문 트리거가 본사 주문 생성).
-- 시크릿 표는 지금처럼 규칙 없음(아무도 직접 못 읽음). 표·칸 추가 없음.

-- ── 1) 복사 ──
create or replace function mall_builder_private.resale_pay_sync(p_source uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_client text; v_on boolean; v_secret text;
begin
  select ps.toss_client_key, ps.card_enabled into v_client, v_on from public.mall_builder_store_payment_settings ps where ps.store_id = p_source;
  select x.toss_secret_key into v_secret from public.mall_builder_store_scheduler_secrets x where x.store_id = p_source;
  perform set_config('mall_builder.resale_pay_sync', 'on', true);
  insert into public.mall_builder_store_payment_settings (store_id, toss_client_key, card_enabled)
    select s.id, coalesce(v_client, ''), coalesce(v_on, false) from public.mall_builder_stores s where s.source_store_id = p_source and s.kind = 'resale'
  on conflict (store_id) do update set toss_client_key = excluded.toss_client_key, card_enabled = excluded.card_enabled, updated_at = now();
  insert into public.mall_builder_store_scheduler_secrets (store_id, toss_secret_key)
    select s.id, coalesce(v_secret, '') from public.mall_builder_stores s where s.source_store_id = p_source and s.kind = 'resale'
  on conflict (store_id) do update set toss_secret_key = excluded.toss_secret_key, updated_at = now();
  perform set_config('mall_builder.resale_pay_sync', '', true);
end;
$$;
revoke all on function mall_builder_private.resale_pay_sync(uuid) from public, anon, authenticated;

-- 본사 값이 바뀌면 그 본사의 분양몰 전체에 복사, 분양몰 값은 복사 중에만 바뀜
create or replace function public.mall_builder_pay_settings_resale()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_kind text;
begin
  select s.kind into v_kind from public.mall_builder_stores s where s.id = new.store_id;
  if v_kind = 'resale' then return null; end if; -- 분양몰 행 검사는 BEFORE 트리거가 함
  -- 시크릿 표에서는 토스 시크릿이 바뀐 때만(다른 비밀값·알림·AI 키만 바뀌면 그대로). 표마다 칸이 달라 조건을 나눠 씀
  if tg_table_name = 'mall_builder_store_scheduler_secrets' and tg_op = 'UPDATE' then
    if new.toss_secret_key is not distinct from old.toss_secret_key then return null; end if;
  end if;
  if exists (select 1 from public.mall_builder_stores s where s.source_store_id = new.store_id and s.kind = 'resale') then
    perform mall_builder_private.resale_pay_sync(new.store_id);
  end if;
  return null;
end;
$$;
-- 분양몰 행을 막는 검사는 쓰기 전에(BEFORE), 본사 복사는 쓴 뒤에(AFTER, 위 함수)
create or replace function public.mall_builder_pay_settings_resale_block()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(current_setting('mall_builder.resale_pay_sync', true), '') = 'on' then return new; end if;
  if not exists (select 1 from public.mall_builder_stores s where s.id = new.store_id and s.kind = 'resale') then return new; end if;
  if tg_table_name = 'mall_builder_store_payment_settings' then
    raise exception '분양몰 카드 결제는 본사 토스로 받습니다(본사 설정을 그대로 씁니다).';
  end if;
  -- 시크릿 표: 토스 시크릿을 넣거나 바꿀 때만 막음(알림·AI 키 같은 분양몰 자기 비밀값은 그대로 저장)
  if tg_op = 'INSERT' then
    if new.toss_secret_key <> '' then raise exception '분양몰 카드 결제는 본사 토스로 받습니다(본사 설정을 그대로 씁니다).'; end if;
  elsif new.toss_secret_key is distinct from old.toss_secret_key then
    raise exception '분양몰 카드 결제는 본사 토스로 받습니다(본사 설정을 그대로 씁니다).';
  end if;
  return new;
end;
$$;

drop trigger if exists mall_builder_pay_settings_resale_block on public.mall_builder_store_payment_settings;
create trigger mall_builder_pay_settings_resale_block before insert or update on public.mall_builder_store_payment_settings
  for each row execute function public.mall_builder_pay_settings_resale_block();
drop trigger if exists mall_builder_pay_settings_resale on public.mall_builder_store_payment_settings;
create trigger mall_builder_pay_settings_resale after insert or update on public.mall_builder_store_payment_settings
  for each row execute function public.mall_builder_pay_settings_resale();
drop trigger if exists mall_builder_pay_secret_resale_block on public.mall_builder_store_scheduler_secrets;
create trigger mall_builder_pay_secret_resale_block before insert or update on public.mall_builder_store_scheduler_secrets
  for each row execute function public.mall_builder_pay_settings_resale_block();
drop trigger if exists mall_builder_pay_secret_resale on public.mall_builder_store_scheduler_secrets;
create trigger mall_builder_pay_secret_resale after insert or update on public.mall_builder_store_scheduler_secrets
  for each row execute function public.mall_builder_pay_settings_resale();

-- 분양몰이 생기거나 본사가 바뀌면 그 본사 값으로
create or replace function public.mall_builder_stores_resale_pay()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'resale' and new.source_store_id is not null
     and (tg_op = 'INSERT' or new.source_store_id is distinct from old.source_store_id or new.kind is distinct from old.kind) then
    perform mall_builder_private.resale_pay_sync(new.source_store_id);
  end if;
  return null;
end;
$$;
drop trigger if exists mall_builder_stores_resale_pay on public.mall_builder_stores;
create trigger mall_builder_stores_resale_pay after insert or update of kind, source_store_id on public.mall_builder_stores
  for each row execute function public.mall_builder_stores_resale_pay();

-- 이미 있는 분양몰도 한 번 맞춤
do $$ declare r record; begin
  for r in select distinct s.source_store_id from public.mall_builder_stores s where s.kind = 'resale' and s.source_store_id is not null loop
    perform mall_builder_private.resale_pay_sync(r.source_store_id);
  end loop;
end $$;

-- ── 2) 분양몰 보호 트리거: 카드 결제 완료 주문의 입금 대기 → 결제 완료는 통과 ──
create or replace function public.mall_builder_orders_resale_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_kind text;
begin
  if new.status is not distinct from old.status or auth.uid() is null or coalesce(current_setting('mall_builder.resale_sync', true), '') = 'on' then return new; end if;
  select s.kind into v_kind from public.mall_builder_stores s where s.id = new.store_id;
  if v_kind = 'resale' and new.status in ('paid', 'preparing', 'shipping') then
    -- M5-2: 유저 카드 결제(본사 토스) 승인으로 「결제 완료」가 되는 경우만 허용
    if old.status = 'pending_payment' and new.status = 'paid' and old.is_card
       and exists (select 1 from public.mall_builder_card_payments cp where cp.order_id = old.id and cp.status = 'done') then
      return new;
    end if;
    raise exception '분양몰 주문의 입금 확인·발송 상태는 본사가 처리합니다(본사 「분양」 화면·본사 발송을 따라 자동으로 바뀝니다).';
  end if;
  return new;
end;
$$;
