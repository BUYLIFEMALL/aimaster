-- 운영 0101 실행 전 확인(읽기 전용) — 「전체」가 OK일 때만 apply-1-0101.sql
-- 대상: 운영 Supabase 「AIMaster」 ref esgxyikcnnvmlhygjkth 의 SQL 편집기만(화면 위 프로젝트 이름·주소 ref를 먼저 눈으로 확인). Lab(rjjtjakljjxsgjelqgek)은 이미 0101~0104가 있어 아래 조건에서 멈춘다.
-- 초안: Master 배정 + 주인님 승인 전에는 실행하지 않는다(B2B-20261118-02). 생성: build.mjs
-- 판정 줄 1~5, 기록 줄 6~8(판정 없음 — 실행 기록에 남김). 값이 비면(NULL) 「(없음)」으로 바꿔 불일치로 센다.
set search_path to "$user", public, extensions;
with chk as (
  select 1 o, '선행 적용 기록 각 1줄(mall_builder_0100_cash_receipts)' 항목, '1' 기대,
    concat_ws('/', (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0100_cash_receipts')::text) 실제
  union all select 2, '이번·이후 적용 기록 없음(mall_builder_0101_messaging, mall_builder_0102_exchanges, mall_builder_0103_exchange_confirmed_window, mall_builder_0104_exchange_fee_payments)', '0',
    ((select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0101_messaging') + (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0102_exchanges') + (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0103_exchange_confirmed_window') + (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0104_exchange_fee_payments'))::text
  union all select 3, '이번 단계가 만들 구조 92개 중 이미 있는 것 0(부분 적용·Lab 혼동 차단)', '0', (select count(*) from (select k, key, val from (
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
  ('trg', 'mall_builder_order_events.mall_builder_order_events_enqueue_more')) e(k, key) using (k, key))::text
  union all select 4, '필요한 확장(없음)', '-',
    '-'
  union all select 5, 'DB 시간대 UTC(적용 기록 version은 UTC)', 'UTC', current_setting('TimeZone')
), j as (select o, 항목, 기대, coalesce(실제, '(없음)') 실제 from chk)
select o 순서, 항목, 기대, 실제, case when 기대 = 실제 then 'OK' else '확인 필요' end 판정 from j
union all select 6, '기록: lab_admin 스키마 있음(Lab이면 보통 true — 판정 아님, 3번이 실제 차단)', '-', (to_regnamespace('lab_admin') is not null)::text, '기록'
union all select 7, '기록: 쇼핑몰 표 수·전체 행 수(적용 전 기준, 적용 파일이 같은 트랜잭션에서 다시 비교)', '-',
  (select count(*) || ' 표 / ' || coalesce(sum(n_live_tup), 0) || ' 행(통계 추정)' from pg_stat_user_tables where schemaname = 'public' and relname like 'mall\_builder\_%'), '기록'
union all select 8, '기록: Postgres 판', '-', current_setting('server_version'), '기록'
union all select 9, '전체', '5/5', (select count(*) filter (where 기대 = 실제) from j)::text || '/' || (select count(*) from j)::text,
  case when (select count(*) from j) = 5 and (select count(*) filter (where 기대 = 실제) from j) = 5 then 'OK' else '확인 필요' end
order by 1;
