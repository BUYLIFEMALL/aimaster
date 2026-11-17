-- 운영 0101 적용(한 트랜잭션, repeatable read) — 시작 조건 → 기존 자료 지문 → 원문 → 지문 다시 비교 → 적용 기록
-- 대상: 운영 Supabase 「AIMaster」 ref esgxyikcnnvmlhygjkth 의 SQL 편집기만(화면 위 프로젝트 이름·주소 ref를 먼저 눈으로 확인). Lab(rjjtjakljjxsgjelqgek)은 이미 0101~0104가 있어 아래 조건에서 멈춘다.
-- 초안: Master 배정 + 주인님 승인 전에는 실행하지 않는다(B2B-20261118-02). 생성: build.mjs
-- ⚠ 하나라도 어긋나면 [멈춤] 오류로 전체가 취소되고 아무것도 바뀌지 않는다. 결과가 「Success」가 아니면 다시 실행하지 말고 먼저 읽기(precheck)로 기록·구조를 확인한다.
-- 기존 자료 지문: 적용 전에 있던 쇼핑몰 표마다 「적용 전 칸 목록」으로 행 수·md5를 남기고, 원문 뒤 같은 칸으로 다시 계산해 다르면 취소한다(운영 값을 미리 적지 않음).
begin isolation level repeatable read;
set local lock_timeout = '5s';
set local statement_timeout = '120s';
set search_path to "$user", public, extensions;
do $pre$ begin
  if (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0100_cash_receipts') <> 1 then raise exception '[멈춤] 선행 적용 기록 mall_builder_0100_cash_receipts가 정확히 1줄이 아닙니다.'; end if;
  if ((select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0101_messaging') + (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0102_exchanges') + (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0103_exchange_confirmed_window') + (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0104_exchange_fee_payments')) <> 0 then raise exception '[멈춤] 이번 또는 이후 단계 적용 기록이 이미 있습니다(Lab이거나 이미 적용됨).'; end if;
  if (select count(*) from (select k, key, val from (
  with tbl as (
    select c.oid, c.relname tname, c.relrowsecurity rls, c.relacl
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'mall\_builder\_%'
  ),
  rl(r) as (values ('anon'), ('authenticated')),
  fn as (
    select p.oid, n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' fkey, p.prosecdef, p.proconfig, p.prosrc, p.proacl
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where (n.nspname = 'public' and p.proname like 'mall\_builder\_%') or n.nspname = 'mall_builder_private'
  )
  select 'col' k, t.tname || '.' || a.attname key,
         format_type(a.atttypid, a.atttypmod) || case when a.attnotnull then ' NN' else '' end || coalesce(' D=' || pg_get_expr(d.adbin, d.adrelid), '') val
    from tbl t join pg_attribute a on a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  union all select 'rls', tname, rls::text from tbl
  union all select 'con', t.tname || '.' || c.conname, c.contype::text || ':' || pg_get_constraintdef(c.oid) from tbl t join pg_constraint c on c.conrelid = t.oid
  union all select 'idx', t.tname || '.' || i.relname, md5(pg_get_indexdef(x.indexrelid))
    from tbl t join pg_index x on x.indrelid = t.oid join pg_class i on i.oid = x.indexrelid
  union all select 'polcount', t.tname, (select count(*) from pg_policy p where p.polrelid = t.oid)::text from tbl t
  union all select 'pol', t.tname || '.' || p.polname,
         p.polcmd::text || ':' || case when p.polpermissive then 'permissive' else 'restrictive' end || ':'
         || coalesce((select string_agg(x::text, ',' order by x::text) from unnest(p.polroles::regrole[]) x), '-') || ':'
         || coalesce(md5(pg_get_expr(p.polqual, p.polrelid)), '-') || ':' || coalesce(md5(pg_get_expr(p.polwithcheck, p.polrelid)), '-')
    from tbl t join pg_policy p on p.polrelid = t.oid
  -- 표 권한: 역할별 실제 효력 + PUBLIC·anon·authenticated 직접 부여 종류
  union all select 'tblpriv', t.tname,
         (select string_agg(rl.r || '=' || concat_ws('', case when has_table_privilege(rl.r, t.oid, 'select') then 's' end, case when has_table_privilege(rl.r, t.oid, 'insert') then 'i' end,
            case when has_table_privilege(rl.r, t.oid, 'update') then 'u' end, case when has_table_privilege(rl.r, t.oid, 'delete') then 'd' end,
            case when has_table_privilege(rl.r, t.oid, 'truncate') then 't' end, case when has_table_privilege(rl.r, t.oid, 'references') then 'r' end), ' ' order by rl.r) from rl)
         || ' | direct=' || coalesce((select string_agg(distinct case when e.grantee = 0 then 'PUBLIC' else e.grantee::regrole::text end || ':' || e.privilege_type, ',')
              from aclexplode(t.relacl) e where e.grantee = 0 or e.grantee in (select oid from pg_roles where rolname in ('anon', 'authenticated'))), '-')
    from tbl t
  -- 칸 권한: 역할별 실제 효력(읽기·추가·수정)
  union all select 'colpriv', t.tname || '.' || a.attname,
         (select string_agg(rl.r || '=' || concat_ws('', case when has_column_privilege(rl.r, t.oid, a.attnum, 'select') then 's' end,
            case when has_column_privilege(rl.r, t.oid, a.attnum, 'insert') then 'i' end, case when has_column_privilege(rl.r, t.oid, a.attnum, 'update') then 'u' end), ' ' order by rl.r) from rl)
    from tbl t join pg_attribute a on a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
  union all select 'fn', fkey, prosecdef::text || ':' || coalesce(array_to_string(proconfig, ','), '-') || ':' || md5(prosrc) from fn
  union all select 'fnexec', fkey,
         'anon=' || has_function_privilege('anon', oid, 'execute') || ' authenticated=' || has_function_privilege('authenticated', oid, 'execute')
         || ' public_direct=' || case when proacl is null then 'default' else (select count(*) from aclexplode(proacl) e where e.grantee = 0)::text end
    from fn
  union all select 'trg', t.tname || '.' || g.tgname, g.tgenabled::text || '|' || md5(pg_get_triggerdef(g.oid))
    from tbl t join pg_trigger g on g.tgrelid = t.oid and not g.tgisinternal
) s) s join (values ('col', 'mall_builder_campaigns.id'),
  ('col', 'mall_builder_campaigns.store_id'),
  ('col', 'mall_builder_campaigns.channel'),
  ('col', 'mall_builder_campaigns.is_ad'),
  ('col', 'mall_builder_campaigns.subject'),
  ('col', 'mall_builder_campaigns.body'),
  ('col', 'mall_builder_campaigns.order_id'),
  ('col', 'mall_builder_campaigns.target_count'),
  ('col', 'mall_builder_campaigns.queued_count'),
  ('col', 'mall_builder_campaigns.skipped'),
  ('col', 'mall_builder_campaigns.created_by'),
  ('col', 'mall_builder_campaigns.created_at'),
  ('col', 'mall_builder_notifications.campaign_id'),
  ('col', 'mall_builder_notify_templates.store_id'),
  ('col', 'mall_builder_notify_templates.kind'),
  ('col', 'mall_builder_notify_templates.channel'),
  ('col', 'mall_builder_notify_templates.subject'),
  ('col', 'mall_builder_notify_templates.body'),
  ('col', 'mall_builder_notify_templates.updated_at'),
  ('col', 'mall_builder_store_notify_settings.bulk_once'),
  ('col', 'mall_builder_store_notify_settings.bulk_day'),
  ('col', 'mall_builder_store_notify_settings.optout_text'),
  ('col', 'mall_builder_store_notify_settings.extra_kinds'),
  ('col', 'mall_builder_store_notify_settings.extra_email_kinds'),
  ('rls', 'mall_builder_campaigns'),
  ('rls', 'mall_builder_notify_templates'),
  ('con', 'mall_builder_campaigns.mall_builder_campaigns_created_by_fkey'),
  ('con', 'mall_builder_campaigns.mall_builder_campaigns_body_check'),
  ('con', 'mall_builder_campaigns.mall_builder_campaigns_channel_check'),
  ('con', 'mall_builder_campaigns.mall_builder_campaigns_subject_check'),
  ('con', 'mall_builder_campaigns.mall_builder_campaigns_pkey'),
  ('con', 'mall_builder_campaigns.mall_builder_campaigns_store_id_fkey'),
  ('con', 'mall_builder_campaigns.mall_builder_campaigns_order_id_fkey'),
  ('con', 'mall_builder_notifications.mall_builder_notifications_campaign_id_fkey'),
  ('con', 'mall_builder_notify_templates.mall_builder_notify_templates_kind_check'),
  ('con', 'mall_builder_notify_templates.mall_builder_notify_templates_channel_check'),
  ('con', 'mall_builder_notify_templates.mall_builder_notify_templates_subject_check'),
  ('con', 'mall_builder_notify_templates.mall_builder_notify_templates_body_check'),
  ('con', 'mall_builder_notify_templates.mall_builder_notify_templates_pkey'),
  ('con', 'mall_builder_notify_templates.mall_builder_notify_templates_store_id_fkey'),
  ('con', 'mall_builder_store_notify_settings.mall_builder_store_notify_settings_msg'),
  ('idx', 'mall_builder_campaigns.mall_builder_campaigns_pkey'),
  ('idx', 'mall_builder_campaigns.mall_builder_campaigns_store'),
  ('idx', 'mall_builder_notifications.mall_builder_notifications_campaign'),
  ('idx', 'mall_builder_notifications.mall_builder_notifications_store_time'),
  ('idx', 'mall_builder_notify_templates.mall_builder_notify_templates_pkey'),
  ('polcount', 'mall_builder_campaigns'),
  ('polcount', 'mall_builder_notify_templates'),
  ('pol', 'mall_builder_campaigns.mall_builder_campaigns_read'),
  ('pol', 'mall_builder_notify_templates.mall_builder_notify_templates_read'),
  ('tblpriv', 'mall_builder_campaigns'),
  ('tblpriv', 'mall_builder_notify_templates'),
  ('colpriv', 'mall_builder_campaigns.id'),
  ('colpriv', 'mall_builder_campaigns.store_id'),
  ('colpriv', 'mall_builder_campaigns.channel'),
  ('colpriv', 'mall_builder_campaigns.is_ad'),
  ('colpriv', 'mall_builder_campaigns.subject'),
  ('colpriv', 'mall_builder_campaigns.body'),
  ('colpriv', 'mall_builder_campaigns.order_id'),
  ('colpriv', 'mall_builder_campaigns.target_count'),
  ('colpriv', 'mall_builder_campaigns.queued_count'),
  ('colpriv', 'mall_builder_campaigns.skipped'),
  ('colpriv', 'mall_builder_campaigns.created_by'),
  ('colpriv', 'mall_builder_campaigns.created_at'),
  ('colpriv', 'mall_builder_notifications.campaign_id'),
  ('colpriv', 'mall_builder_notify_templates.store_id'),
  ('colpriv', 'mall_builder_notify_templates.kind'),
  ('colpriv', 'mall_builder_notify_templates.channel'),
  ('colpriv', 'mall_builder_notify_templates.subject'),
  ('colpriv', 'mall_builder_notify_templates.body'),
  ('colpriv', 'mall_builder_notify_templates.updated_at'),
  ('colpriv', 'mall_builder_store_notify_settings.bulk_once'),
  ('colpriv', 'mall_builder_store_notify_settings.bulk_day'),
  ('colpriv', 'mall_builder_store_notify_settings.optout_text'),
  ('colpriv', 'mall_builder_store_notify_settings.extra_kinds'),
  ('colpriv', 'mall_builder_store_notify_settings.extra_email_kinds'),
  ('fn', 'mall_builder_private.fill_order_text(p_text text, p_order_id uuid)'),
  ('fn', 'mall_builder_private.notifications_apply_template()'),
  ('fn', 'mall_builder_private.order_events_enqueue_more()'),
  ('fn', 'mall_builder_private.kst_hour()'),
  ('fn', 'public.mall_builder_message_send(p_store_id uuid, p_channel text, p_is_ad boolean, p_subject text, p_body text, p_customer_ids uuid[], p_order_id uuid, p_dry_run boolean)'),
  ('fn', 'public.mall_builder_notify_template_save(p_store_id uuid, p_kind text, p_channel text, p_subject text, p_body text)'),
  ('fn', 'public.mall_builder_message_settings_save(p_store_id uuid, p_bulk_once integer, p_bulk_day integer, p_optout text, p_extra_kinds text[], p_extra_email_kinds text[])'),
  ('fnexec', 'mall_builder_private.fill_order_text(p_text text, p_order_id uuid)'),
  ('fnexec', 'mall_builder_private.notifications_apply_template()'),
  ('fnexec', 'mall_builder_private.order_events_enqueue_more()'),
  ('fnexec', 'mall_builder_private.kst_hour()'),
  ('fnexec', 'public.mall_builder_message_send(p_store_id uuid, p_channel text, p_is_ad boolean, p_subject text, p_body text, p_customer_ids uuid[], p_order_id uuid, p_dry_run boolean)'),
  ('fnexec', 'public.mall_builder_notify_template_save(p_store_id uuid, p_kind text, p_channel text, p_subject text, p_body text)'),
  ('fnexec', 'public.mall_builder_message_settings_save(p_store_id uuid, p_bulk_once integer, p_bulk_day integer, p_optout text, p_extra_kinds text[], p_extra_email_kinds text[])'),
  ('trg', 'mall_builder_notifications.mall_builder_notifications_template'),
  ('trg', 'mall_builder_order_events.mall_builder_order_events_enqueue_more')) e(k, key) using (k, key)) <> 0 then raise exception '[멈춤] 이번 단계가 만들 구조가 이미 일부 있습니다(부분 적용·옛 정의). 사람이 확인하세요.'; end if;

end $pre$;
create temp table _mb_fp (t text primary key, cols text, n bigint, h text) on commit drop;
do $fp$ declare r record; c text; v_n bigint; v_h text; begin
  for r in select c2.relname from pg_class c2 join pg_namespace s on s.oid = c2.relnamespace where s.nspname = 'public' and c2.relkind = 'r' and c2.relname like 'mall\_builder\_%' loop
    select string_agg(quote_ident(a.attname), ',' order by a.attnum) into c from pg_attribute a where a.attrelid = format('public.%I', r.relname)::regclass and a.attnum > 0 and not a.attisdropped;
    execute format('select count(*), md5(coalesce(string_agg(x::text, chr(10) order by x::text), '''')) from (select %s from public.%I) x', c, r.relname) into v_n, v_h;
    insert into _mb_fp values (r.relname, c, v_n, v_h);
  end loop;
end $fp$;
-- ── 원문: supabase/migrations/0101_messaging.sql (커밋 51b2f3e91, LF sha256 546bd8dd192ae33bcfa30eb01457c47f69e972910b4f6b7ec24abe407d7edd76) — 한 글자도 바꾸지 않음 ──
-- AI 쇼핑몰 빌더 M2-12a — 운영사 메시지(개별·대량 문자/메일)·자동 알림 문구 편집·알림 종류 추가(취소·반품·환불)
-- 플랜: docs/PLAN_20261116_M2_12_MESSAGING_EXCHANGE.md (주인님 결정 2026-11-16: 알림톡 다음, 한 번 1,000명·하루 3,000명)
-- 추가만 하는 변경(표·칸·트리거 drop 없음, 새 함수의 PUBLIC 실행 회수만). 발송은 기존 대기 줄(mall_builder_notifications, 0025·0026) + 1분 실행 주소가 그대로 맡는다.
-- 기존 주문 알림 함수(order_events_enqueue)는 고치지 않는다 — 문구 편집은 대기 줄에 들어가는 순간(BEFORE INSERT) 바꿔 끼운다.

-- ── 0101a ── 칸·표
alter table public.mall_builder_store_notify_settings add column if not exists bulk_once integer not null default 1000;
alter table public.mall_builder_store_notify_settings add column if not exists bulk_day integer not null default 3000;
alter table public.mall_builder_store_notify_settings add column if not exists optout_text text not null default '';  -- 광고 문자 끝 「무료 수신 거부」 안내
-- 새 알림 종류(기존 kinds 제약을 지우지 않으려고 칸을 따로 둔다)
alter table public.mall_builder_store_notify_settings add column if not exists extra_kinds text[] not null default '{}';
alter table public.mall_builder_store_notify_settings add column if not exists extra_email_kinds text[] not null default '{}';
do $$ begin
  alter table public.mall_builder_store_notify_settings add constraint mall_builder_store_notify_settings_msg check (
    bulk_once between 1 and 1000 and bulk_day between 1 and 3000 and char_length(optout_text) <= 60
    and extra_kinds <@ array['customer_cancelled','customer_returned','customer_refunded']::text[]
    and extra_email_kinds <@ array['customer_cancelled','customer_returned','customer_refunded']::text[]);
exception when duplicate_object then null; end $$;

-- 보낸 묶음(개별 1명도 한 묶음) — 누가·언제·몇 명·광고인지
create table if not exists public.mall_builder_campaigns (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  channel text not null check (channel in ('sms', 'email')),
  is_ad boolean not null default false,
  subject text not null default '' check (char_length(subject) <= 120),
  body text not null check (char_length(body) between 1 and 2000),
  order_id uuid references public.mall_builder_orders (id) on delete set null, -- 주문 화면에서 보낸 개별 메시지
  target_count integer not null default 0,
  queued_count integer not null default 0,
  skipped jsonb not null default '{}'::jsonb, -- {"no_agree":n,"no_contact":n}
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.mall_builder_campaigns enable row level security;
create policy "mall_builder_campaigns_read" on public.mall_builder_campaigns
  for select using (public.mall_builder_staff_can(store_id, 'customers'));
create index if not exists mall_builder_campaigns_store on public.mall_builder_campaigns (store_id, created_at desc);

alter table public.mall_builder_notifications add column if not exists campaign_id uuid references public.mall_builder_campaigns (id) on delete set null;
create index if not exists mall_builder_notifications_campaign on public.mall_builder_notifications (campaign_id);
create index if not exists mall_builder_notifications_store_time on public.mall_builder_notifications (store_id, created_at desc);

-- 몰이 고친 자동 알림 문구(종류·통로마다 한 줄). 없으면 기본 문구
create table if not exists public.mall_builder_notify_templates (
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  kind text not null check (kind in ('staff_new_order','customer_received','customer_paid','customer_shipped','customer_expired',
                                     'customer_cancelled','customer_returned','customer_refunded')),
  channel text not null check (channel in ('sms', 'email')),
  subject text not null default '' check (char_length(subject) <= 120),
  body text not null check (char_length(body) between 1 and 1000),
  updated_at timestamptz not null default now(),
  primary key (store_id, kind, channel)
);
alter table public.mall_builder_notify_templates enable row level security;
create policy "mall_builder_notify_templates_read" on public.mall_builder_notify_templates
  for select using (public.mall_builder_is_store_staff(store_id));

-- ── 0101b ── 문구 치환
-- {몰이름} {주문번호} {금액} {받는분} {택배사} {송장번호} {입금계좌} {입금기한} {환불금액}
create or replace function mall_builder_private.fill_order_text(p_text text, p_order_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare o public.mall_builder_orders%rowtype; v_name text; t text := coalesce(p_text, '');
begin
  select * into o from public.mall_builder_orders where id = p_order_id;
  if o.id is null then return t; end if;
  select st.name into v_name from public.mall_builder_stores st where st.id = o.store_id;
  t := replace(t, '{몰이름}', coalesce(v_name, ''));
  t := replace(t, '{주문번호}', coalesce(o.order_no, ''));
  t := replace(t, '{금액}', to_char(o.total, 'FM999,999,999,990') || '원');
  t := replace(t, '{받는분}', coalesce(o.receiver ->> 'name', ''));
  t := replace(t, '{택배사}', coalesce(nullif(o.courier, ''), '택배'));
  t := replace(t, '{송장번호}', coalesce(nullif(o.tracking_no, ''), '-'));
  t := replace(t, '{입금계좌}', case when coalesce(o.bank ->> 'bank_account', '') <> ''
      then coalesce(o.bank ->> 'bank_name', '') || ' ' || (o.bank ->> 'bank_account') || ' (' || coalesce(o.bank ->> 'bank_holder', '') || ')'
      else '주문 상세 화면 참고' end);
  t := replace(t, '{입금기한}', coalesce(to_char(o.pay_deadline_at at time zone 'Asia/Seoul', 'MM/DD HH24:MI'), '-'));
  t := replace(t, '{환불금액}', to_char(coalesce(o.refund_amount, 0), 'FM999,999,999,990') || '원');
  return t;
end;
$$;
revoke all on function mall_builder_private.fill_order_text(text, uuid) from public;

-- 주문 알림이 대기 줄에 들어갈 때 몰 문구가 있으면 바꿔 끼운다(개별·대량 메시지는 campaign_id가 있어 건너뜀)
create or replace function mall_builder_private.notifications_apply_template()
returns trigger language plpgsql security definer set search_path = '' as $$
declare tp public.mall_builder_notify_templates%rowtype; v_name text;
begin
  if new.order_id is null or new.campaign_id is not null then return new; end if;
  select * into tp from public.mall_builder_notify_templates t
   where t.store_id = new.store_id and t.channel = new.channel and t.kind = regexp_replace(new.kind, '^email_', '');
  if tp.store_id is null then return new; end if;
  new.body := left(mall_builder_private.fill_order_text(tp.body, new.order_id), 2000);
  if new.channel = 'email' and tp.subject <> '' then
    select st.name into v_name from public.mall_builder_stores st where st.id = new.store_id;
    new.subject := left('[' || coalesce(v_name, '쇼핑몰') || '] ' || mall_builder_private.fill_order_text(tp.subject, new.order_id), 200);
  end if;
  return new;
end;
$$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'mall_builder_notifications_template') then
    create trigger mall_builder_notifications_template before insert on public.mall_builder_notifications
      for each row execute function mall_builder_private.notifications_apply_template();
  end if;
end $$;

-- ── 0101c ── 새 알림 종류: 취소(운영사·유저가 취소, 입금 기한 자동 취소는 기존 customer_expired)·반품 승인·환불 완료
create or replace function mall_builder_private.order_events_enqueue_more()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  o public.mall_builder_orders%rowtype; ns public.mall_builder_store_notify_settings%rowtype;
  v_sms boolean; v_mail boolean; v_kind text; v_name text; v_head text; v_phone text; v_email text; v_body text; v_subject text;
begin
  select * into o from public.mall_builder_orders where id = new.order_id;
  if o.id is null then return new; end if;
  v_kind := case
    when new.to_status = 'cancelled' and new.from_status is distinct from 'cancelled' and coalesce(new.actor_role, '') <> 'system' then 'customer_cancelled'
    when new.to_status = 'returned' and new.from_status is distinct from 'returned' then 'customer_returned'
    when new.from_status is not distinct from new.to_status and coalesce(new.note, '') like '환불 완료%' then 'customer_refunded'
    else null end;
  if v_kind is null then return new; end if;
  select * into ns from public.mall_builder_store_notify_settings s where s.store_id = o.store_id;
  if ns.store_id is null then return new; end if;
  if not exists (select 1 from public.mall_builder_store_schedulers s where s.store_id = o.store_id and s.job_id is not null and not s.paused) then return new; end if;
  select v_kind = any(ns.extra_kinds) and x.solapi_api_key <> '' and x.solapi_api_secret <> '',
         v_kind = any(ns.extra_email_kinds) and x.resend_api_key <> '' and ns.email_from <> ''
    into v_sms, v_mail from public.mall_builder_store_scheduler_secrets x where x.store_id = o.store_id;
  if not coalesce(v_sms, false) and not coalesce(v_mail, false) then return new; end if;

  select st.name into v_name from public.mall_builder_stores st where st.id = o.store_id;
  v_head := '[' || coalesce(v_name, '쇼핑몰') || '] ';
  v_phone := public.mall_builder_digits(o.receiver ->> 'phone');
  select lower(u.email) into v_email from auth.users u where u.id = o.user_id;
  v_email := coalesce(v_email, lower(nullif(to_jsonb(o) ->> 'guest_email', '')), '');
  if v_kind = 'customer_cancelled' then
    v_subject := '주문 ' || o.order_no || ' 취소';
    v_body := v_head || '주문 ' || o.order_no || '이 취소되었습니다. 결제하신 금액은 결제 방법에 따라 환불됩니다.';
  elsif v_kind = 'customer_returned' then
    v_subject := '주문 ' || o.order_no || ' 반품 완료';
    v_body := v_head || '주문 ' || o.order_no || '의 반품이 승인되었습니다. 환불 예정 ' || to_char(coalesce(o.refund_amount, 0), 'FM999,999,999,990') || '원.';
  else
    v_subject := '주문 ' || o.order_no || ' 환불 완료';
    v_body := v_head || '주문 ' || o.order_no || '의 환불 ' || to_char(coalesce(o.refund_amount, 0), 'FM999,999,999,990') || '원이 완료되었습니다.';
  end if;
  if coalesce(v_sms, false) and v_phone <> '' then
    insert into public.mall_builder_notifications (store_id, order_id, kind, channel, to_phone, body)
    values (o.store_id, o.id, v_kind, 'sms', v_phone, v_body) on conflict do nothing;
  end if;
  if coalesce(v_mail, false) and v_email <> '' then
    insert into public.mall_builder_notifications (store_id, order_id, kind, channel, to_phone, to_email, subject, body)
    values (o.store_id, o.id, 'email_' || v_kind, 'email', '', v_email, v_head || v_subject, v_body) on conflict do nothing;
  end if;
  return new;
end;
$$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'mall_builder_order_events_enqueue_more') then
    create trigger mall_builder_order_events_enqueue_more after insert on public.mall_builder_order_events
      for each row execute function mall_builder_private.order_events_enqueue_more();
  end if;
end $$;

-- ── 0101d ── 운영사 함수
-- 한국 시각(시) — 시나리오가 바꿔 끼워 밤 시간 규칙을 시험한다
create or replace function mall_builder_private.kst_hour()
returns integer language sql stable set search_path = '' as $$ select extract(hour from now() at time zone 'Asia/Seoul')::integer $$;

-- 설정(대표만): 상한·수신 거부 안내·새 알림 종류
create or replace function public.mall_builder_message_settings_save(p_store_id uuid, p_bulk_once integer, p_bulk_day integer, p_optout text,
  p_extra_kinds text[], p_extra_email_kinds text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.mall_builder_staff_can(p_store_id, 'owner') then raise exception '대표만 바꿀 수 있습니다.'; end if;
  if p_bulk_once not between 1 and 1000 then raise exception '한 번에 보낼 수 있는 인원은 1~1,000명입니다.'; end if;
  if p_bulk_day not between 1 and 3000 then raise exception '하루에 보낼 수 있는 인원은 1~3,000명입니다.'; end if;
  if char_length(coalesce(p_optout, '')) > 60 then raise exception '수신 거부 안내는 60자까지입니다.'; end if;
  if not (coalesce(p_extra_kinds, '{}') <@ array['customer_cancelled','customer_returned','customer_refunded']::text[])
     or not (coalesce(p_extra_email_kinds, '{}') <@ array['customer_cancelled','customer_returned','customer_refunded']::text[]) then
    raise exception '알 수 없는 알림 종류입니다.';
  end if;
  insert into public.mall_builder_store_notify_settings (store_id, bulk_once, bulk_day, optout_text, extra_kinds, extra_email_kinds)
  values (p_store_id, p_bulk_once, p_bulk_day, btrim(coalesce(p_optout, '')), coalesce(p_extra_kinds, '{}'), coalesce(p_extra_email_kinds, '{}'))
  on conflict (store_id) do update set bulk_once = excluded.bulk_once, bulk_day = excluded.bulk_day, optout_text = excluded.optout_text,
    extra_kinds = excluded.extra_kinds, extra_email_kinds = excluded.extra_email_kinds, updated_at = now();
end;
$$;

-- 문구 저장(대표만). 본문이 빈 글이면 기본 문구로 되돌림(줄 삭제)
create or replace function public.mall_builder_notify_template_save(p_store_id uuid, p_kind text, p_channel text, p_subject text, p_body text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.mall_builder_staff_can(p_store_id, 'owner') then raise exception '대표만 바꿀 수 있습니다.'; end if;
  if btrim(coalesce(p_body, '')) = '' then
    delete from public.mall_builder_notify_templates where store_id = p_store_id and kind = p_kind and channel = p_channel;
    return;
  end if;
  insert into public.mall_builder_notify_templates (store_id, kind, channel, subject, body)
  values (p_store_id, p_kind, p_channel, btrim(coalesce(p_subject, '')), btrim(p_body))
  on conflict (store_id, kind, channel) do update set subject = excluded.subject, body = excluded.body, updated_at = now();
end;
$$;

-- 보내기(유저·쿠폰·포인트 권한). p_dry_run이면 넣지 않고 건수만 돌려준다(미리보기)
-- 받는 사람: p_customer_ids(몰 유저) 또는 p_order_id(그 주문의 받는 분·주문자 메일)
create or replace function public.mall_builder_message_send(p_store_id uuid, p_channel text, p_is_ad boolean, p_subject text, p_body text,
  p_customer_ids uuid[] default '{}', p_order_id uuid default null, p_dry_run boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  ns public.mall_builder_store_notify_settings%rowtype; v_name text; v_hour integer; v_today integer;
  v_targets integer := 0; v_no_agree integer := 0; v_no_contact integer := 0; v_campaign uuid; v_body text; v_subject text; r record; v_n integer := 0;
  o public.mall_builder_orders%rowtype; v_to text;
begin
  if auth.uid() is null or not public.mall_builder_staff_can(p_store_id, 'customers') then raise exception '메시지를 보낼 권한이 없습니다.'; end if;
  if p_channel not in ('sms', 'email') then raise exception '문자 또는 메일을 골라 주세요.'; end if;
  if btrim(coalesce(p_body, '')) = '' then raise exception '보낼 내용을 적어 주세요.'; end if;
  if char_length(p_body) > (case when p_channel = 'sms' then 1000 else 2000 end) then raise exception '내용이 너무 깁니다.'; end if;
  if p_channel = 'email' and btrim(coalesce(p_subject, '')) = '' then raise exception '메일 제목을 적어 주세요.'; end if;
  select * into ns from public.mall_builder_store_notify_settings s where s.store_id = p_store_id;
  select st.name into v_name from public.mall_builder_stores st where st.id = p_store_id;
  -- 실제로 나갈 수 있는가(아니면 대기 줄에서 하루 뒤 버려진다)
  if not exists (select 1 from public.mall_builder_store_schedulers s where s.store_id = p_store_id and s.job_id is not null and not s.paused) then
    raise exception '예약 실행(cron-job.org)이 연결되어 있지 않거나 멈춰 있어 보낼 수 없습니다. 설정에서 먼저 연결해 주세요.';
  end if;
  if p_channel = 'sms' and not exists (select 1 from public.mall_builder_store_scheduler_secrets x where x.store_id = p_store_id and x.solapi_api_key <> '' and x.solapi_api_secret <> '')
     or p_channel = 'sms' and coalesce(ns.sender_phone, '') = '' then
    raise exception '문자를 보내려면 설정에서 솔라피 키와 발신번호를 먼저 등록해 주세요.';
  end if;
  if p_channel = 'email' and (not exists (select 1 from public.mall_builder_store_scheduler_secrets x where x.store_id = p_store_id and x.resend_api_key <> '')
     or coalesce(ns.email_from, '') = '') then
    raise exception '메일을 보내려면 설정에서 Resend 키와 보내는 주소를 먼저 등록해 주세요.';
  end if;
  -- 광고성: 수신 거부 안내 필수, 밤 9시~아침 8시 금지
  if p_is_ad then
    if coalesce(ns.optout_text, '') = '' then raise exception '광고 메시지는 수신 거부 방법을 설정에서 먼저 적어 주세요.'; end if;
    v_hour := mall_builder_private.kst_hour();
    if v_hour >= 21 or v_hour < 8 then raise exception '광고 메시지는 밤 9시부터 아침 8시까지 보낼 수 없습니다.'; end if;
  end if;
  v_subject := case when p_channel = 'email' then left((case when p_is_ad then '(광고) ' else '' end) || '[' || coalesce(v_name, '쇼핑몰') || '] ' || btrim(p_subject), 200) else '' end;
  v_body := case when p_channel = 'sms'
    then (case when p_is_ad then '(광고)' else '' end) || '[' || coalesce(v_name, '쇼핑몰') || '] ' || btrim(p_body) || case when p_is_ad then E'\n' || ns.optout_text else '' end
    else btrim(p_body) || case when p_is_ad then E'\n\n' || ns.optout_text else '' end end;

  create temp table if not exists pg_temp.mb_msg_to (customer_id uuid, to_addr text) on commit drop;
  delete from pg_temp.mb_msg_to where true;  -- Supabase safeupdate는 조건 없는 delete를 막음
  if p_order_id is not null then
    select * into o from public.mall_builder_orders where id = p_order_id and store_id = p_store_id;
    if o.id is null then raise exception '주문을 찾을 수 없습니다.'; end if;
    if p_is_ad then raise exception '주문 화면에서는 광고 메시지를 보낼 수 없습니다.'; end if;
    v_targets := 1;
    if p_channel = 'sms' then v_to := public.mall_builder_digits(o.receiver ->> 'phone');
    else select lower(u.email) into v_to from auth.users u where u.id = o.user_id; v_to := coalesce(v_to, lower(nullif(to_jsonb(o) ->> 'guest_email', '')), ''); end if;
    if coalesce(v_to, '') = '' then v_no_contact := 1; else insert into pg_temp.mb_msg_to values (null, v_to); end if;
  else
    for r in
      select c.id, c.marketing_agree, public.mall_builder_digits(c.phone) as phone, lower(coalesce(u.email, '')) as email
        from public.mall_builder_store_customers c left join auth.users u on u.id = c.user_id
       where c.store_id = p_store_id and c.id = any(coalesce(p_customer_ids, '{}'))
    loop
      v_targets := v_targets + 1;
      if p_is_ad and not r.marketing_agree then v_no_agree := v_no_agree + 1; continue; end if;
      v_to := case when p_channel = 'sms' then r.phone else r.email end;
      if coalesce(v_to, '') = '' then v_no_contact := v_no_contact + 1; continue; end if;
      insert into pg_temp.mb_msg_to values (r.id, v_to);
    end loop;
  end if;
  select count(distinct to_addr) into v_n from pg_temp.mb_msg_to;
  if v_targets = 0 then raise exception '받는 사람을 골라 주세요.'; end if;
  if v_n > coalesce(ns.bulk_once, 1000) then raise exception '한 번에 %명까지 보낼 수 있습니다(이번 %명).', coalesce(ns.bulk_once, 1000), v_n; end if;
  select coalesce(sum(c.queued_count), 0) into v_today from public.mall_builder_campaigns c
   where c.store_id = p_store_id and c.created_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
  if v_today + v_n > coalesce(ns.bulk_day, 3000) then raise exception '오늘 보낼 수 있는 인원(%명)을 넘습니다(오늘 % + 이번 %).', coalesce(ns.bulk_day, 3000), v_today, v_n; end if;

  if p_dry_run then
    return jsonb_build_object('targets', v_targets, 'will_send', v_n, 'no_agree', v_no_agree, 'no_contact', v_no_contact, 'today', v_today,
      'limit_once', coalesce(ns.bulk_once, 1000), 'limit_day', coalesce(ns.bulk_day, 3000), 'preview_subject', v_subject, 'preview_body', v_body);
  end if;
  if v_n = 0 then raise exception '보낼 수 있는 받는 사람이 없습니다(수신 동의·연락처 확인).'; end if;
  insert into public.mall_builder_campaigns (store_id, channel, is_ad, subject, body, order_id, target_count, queued_count, skipped, created_by)
  values (p_store_id, p_channel, coalesce(p_is_ad, false), left(coalesce(v_subject, ''), 120), left(v_body, 2000), p_order_id, v_targets, v_n,
          jsonb_build_object('no_agree', v_no_agree, 'no_contact', v_no_contact), auth.uid())
  returning id into v_campaign;
  insert into public.mall_builder_notifications (store_id, order_id, kind, channel, to_phone, to_email, subject, body, campaign_id)
  select distinct on (t.to_addr) p_store_id, null::uuid, case when p_channel = 'sms' then 'message' else 'email_message' end, p_channel,
         case when p_channel = 'sms' then t.to_addr else '' end, case when p_channel = 'email' then t.to_addr else '' end,
         coalesce(v_subject, ''), v_body, v_campaign
    from pg_temp.mb_msg_to t;
  return jsonb_build_object('campaign_id', v_campaign, 'targets', v_targets, 'will_send', v_n, 'no_agree', v_no_agree, 'no_contact', v_no_contact);
end;
$$;
revoke all on function public.mall_builder_message_send(uuid, text, boolean, text, text, uuid[], uuid, boolean) from public, anon;
grant execute on function public.mall_builder_message_send(uuid, text, boolean, text, text, uuid[], uuid, boolean) to authenticated;
revoke all on function public.mall_builder_message_settings_save(uuid, integer, integer, text, text[], text[]) from public, anon;
grant execute on function public.mall_builder_message_settings_save(uuid, integer, integer, text, text[], text[]) to authenticated;
revoke all on function public.mall_builder_notify_template_save(uuid, text, text, text, text) from public, anon;
grant execute on function public.mall_builder_notify_template_save(uuid, text, text, text, text) to authenticated;

-- ── 원문 끝 ──
do $fpc$ declare r record; v_n bigint; v_h text; begin
  for r in select * from _mb_fp loop
    execute format('select count(*), md5(coalesce(string_agg(x::text, chr(10) order by x::text), '''')) from (select %s from public.%I) x', r.cols, r.t) into v_n, v_h;
    if v_n is distinct from r.n or v_h is distinct from r.h then raise exception '[멈춤] 기존 자료가 바뀌었습니다: % (행 % → %)', r.t, r.n, v_n; end if;
  end loop;
end $fpc$;
-- 적용 기록: UTC 시각(초)을 version으로, 같은 초가 이미 있으면 1초씩 뒤로(기록 번호 충돌 방지)
do $rec$ declare v_t timestamp := clock_timestamp() at time zone 'utc'; v_name text; begin
  foreach v_name in array array['mall_builder_0101_messaging'] loop
    while exists (select 1 from supabase_migrations.schema_migrations where version = to_char(v_t, 'YYYYMMDDHH24MISS')) loop v_t := v_t + interval '1 second'; end loop;
    insert into supabase_migrations.schema_migrations (version, name) values (to_char(v_t, 'YYYYMMDDHH24MISS'), v_name);
    v_t := v_t + interval '1 second';
  end loop;
end $rec$;
commit;
