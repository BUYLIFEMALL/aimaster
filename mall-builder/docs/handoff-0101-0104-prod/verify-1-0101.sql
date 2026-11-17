-- 운영 0101 적용 확인(읽기 전용) — 「전체」 OK면 성공
-- 대상: 운영 Supabase 「AIMaster」 ref esgxyikcnnvmlhygjkth 의 SQL 편집기만(화면 위 프로젝트 이름·주소 ref를 먼저 눈으로 확인). Lab(rjjtjakljjxsgjelqgek)은 이미 0101~0104가 있어 아래 조건에서 멈춘다.
-- 초안: Master 배정 + 주인님 승인 전에는 실행하지 않는다(B2B-20261118-02). 생성: build.mjs
-- 구조 92개를 고정 원문에서 나온 기대 목록(manifest.json, 격리 DB PG 17.11)과 그대로 대조한다(정규화 없음). 어긋나면 3번에 키를 보여 준다.
set search_path to "$user", public, extensions;
with cur as (select k, key, val from (
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
) s),
exp as (select * from (values ('col', 'mall_builder_campaigns.id', 'uuid NN D=gen_random_uuid()'),
  ('col', 'mall_builder_campaigns.store_id', 'uuid NN'),
  ('col', 'mall_builder_campaigns.channel', 'text NN'),
  ('col', 'mall_builder_campaigns.is_ad', 'boolean NN D=false'),
  ('col', 'mall_builder_campaigns.subject', 'text NN D=''''::text'),
  ('col', 'mall_builder_campaigns.body', 'text NN'),
  ('col', 'mall_builder_campaigns.order_id', 'uuid'),
  ('col', 'mall_builder_campaigns.target_count', 'integer NN D=0'),
  ('col', 'mall_builder_campaigns.queued_count', 'integer NN D=0'),
  ('col', 'mall_builder_campaigns.skipped', 'jsonb NN D=''{}''::jsonb'),
  ('col', 'mall_builder_campaigns.created_by', 'uuid'),
  ('col', 'mall_builder_campaigns.created_at', 'timestamp with time zone NN D=now()'),
  ('col', 'mall_builder_notifications.campaign_id', 'uuid'),
  ('col', 'mall_builder_notify_templates.store_id', 'uuid NN'),
  ('col', 'mall_builder_notify_templates.kind', 'text NN'),
  ('col', 'mall_builder_notify_templates.channel', 'text NN'),
  ('col', 'mall_builder_notify_templates.subject', 'text NN D=''''::text'),
  ('col', 'mall_builder_notify_templates.body', 'text NN'),
  ('col', 'mall_builder_notify_templates.updated_at', 'timestamp with time zone NN D=now()'),
  ('col', 'mall_builder_store_notify_settings.bulk_once', 'integer NN D=1000'),
  ('col', 'mall_builder_store_notify_settings.bulk_day', 'integer NN D=3000'),
  ('col', 'mall_builder_store_notify_settings.optout_text', 'text NN D=''''::text'),
  ('col', 'mall_builder_store_notify_settings.extra_kinds', 'text[] NN D=''{}''::text[]'),
  ('col', 'mall_builder_store_notify_settings.extra_email_kinds', 'text[] NN D=''{}''::text[]'),
  ('rls', 'mall_builder_campaigns', 'true'),
  ('rls', 'mall_builder_notify_templates', 'true'),
  ('con', 'mall_builder_campaigns.mall_builder_campaigns_created_by_fkey', 'f:FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),
  ('con', 'mall_builder_campaigns.mall_builder_campaigns_body_check', 'c:CHECK (((char_length(body) >= 1) AND (char_length(body) <= 2000)))'),
  ('con', 'mall_builder_campaigns.mall_builder_campaigns_channel_check', 'c:CHECK ((channel = ANY (ARRAY[''sms''::text, ''email''::text])))'),
  ('con', 'mall_builder_campaigns.mall_builder_campaigns_subject_check', 'c:CHECK ((char_length(subject) <= 120))'),
  ('con', 'mall_builder_campaigns.mall_builder_campaigns_pkey', 'p:PRIMARY KEY (id)'),
  ('con', 'mall_builder_campaigns.mall_builder_campaigns_store_id_fkey', 'f:FOREIGN KEY (store_id) REFERENCES mall_builder_stores(id) ON DELETE CASCADE'),
  ('con', 'mall_builder_campaigns.mall_builder_campaigns_order_id_fkey', 'f:FOREIGN KEY (order_id) REFERENCES mall_builder_orders(id) ON DELETE SET NULL'),
  ('con', 'mall_builder_notifications.mall_builder_notifications_campaign_id_fkey', 'f:FOREIGN KEY (campaign_id) REFERENCES mall_builder_campaigns(id) ON DELETE SET NULL'),
  ('con', 'mall_builder_notify_templates.mall_builder_notify_templates_kind_check', 'c:CHECK ((kind = ANY (ARRAY[''staff_new_order''::text, ''customer_received''::text, ''customer_paid''::text, ''customer_shipped''::text, ''customer_expired''::text, ''customer_cancelled''::text, ''customer_returned''::text, ''customer_refunded''::text])))'),
  ('con', 'mall_builder_notify_templates.mall_builder_notify_templates_channel_check', 'c:CHECK ((channel = ANY (ARRAY[''sms''::text, ''email''::text])))'),
  ('con', 'mall_builder_notify_templates.mall_builder_notify_templates_subject_check', 'c:CHECK ((char_length(subject) <= 120))'),
  ('con', 'mall_builder_notify_templates.mall_builder_notify_templates_body_check', 'c:CHECK (((char_length(body) >= 1) AND (char_length(body) <= 1000)))'),
  ('con', 'mall_builder_notify_templates.mall_builder_notify_templates_pkey', 'p:PRIMARY KEY (store_id, kind, channel)'),
  ('con', 'mall_builder_notify_templates.mall_builder_notify_templates_store_id_fkey', 'f:FOREIGN KEY (store_id) REFERENCES mall_builder_stores(id) ON DELETE CASCADE'),
  ('con', 'mall_builder_store_notify_settings.mall_builder_store_notify_settings_msg', 'c:CHECK ((((bulk_once >= 1) AND (bulk_once <= 1000)) AND ((bulk_day >= 1) AND (bulk_day <= 3000)) AND (char_length(optout_text) <= 60) AND (extra_kinds <@ ARRAY[''customer_cancelled''::text, ''customer_returned''::text, ''customer_refunded''::text]) AND (extra_email_kinds <@ ARRAY[''customer_cancelled''::text, ''customer_returned''::text, ''customer_refunded''::text])))'),
  ('idx', 'mall_builder_campaigns.mall_builder_campaigns_pkey', '76314b619decf2316995f29ed315471a'),
  ('idx', 'mall_builder_campaigns.mall_builder_campaigns_store', '84feba76f6d0e7b94b58317911e88fcc'),
  ('idx', 'mall_builder_notifications.mall_builder_notifications_campaign', 'c6ce8ef3499403178e69f520553e015a'),
  ('idx', 'mall_builder_notifications.mall_builder_notifications_store_time', '23127d650cfed28fa91da6d40f1d385e'),
  ('idx', 'mall_builder_notify_templates.mall_builder_notify_templates_pkey', '6687c354ccadb6bbf60ca59afb659b2a'),
  ('polcount', 'mall_builder_campaigns', '1'),
  ('polcount', 'mall_builder_notify_templates', '1'),
  ('pol', 'mall_builder_campaigns.mall_builder_campaigns_read', 'r:permissive:-:b7bd4b75b1c19b882a1cf90c6e8daa44:-'),
  ('pol', 'mall_builder_notify_templates.mall_builder_notify_templates_read', 'r:permissive:-:11894cb5fcd8382ca72a6f2bb26c324a:-'),
  ('tblpriv', 'mall_builder_campaigns', 'anon=siudtr authenticated=siudtr | direct=anon:DELETE,anon:INSERT,anon:MAINTAIN,anon:REFERENCES,anon:SELECT,anon:TRIGGER,anon:TRUNCATE,anon:UPDATE,authenticated:DELETE,authenticated:INSERT,authenticated:MAINTAIN,authenticated:REFERENCES,authenticated:SELECT,authenticated:TRIGGER,authenticated:TRUNCATE,authenticated:UPDATE'),
  ('tblpriv', 'mall_builder_notify_templates', 'anon=siudtr authenticated=siudtr | direct=anon:DELETE,anon:INSERT,anon:MAINTAIN,anon:REFERENCES,anon:SELECT,anon:TRIGGER,anon:TRUNCATE,anon:UPDATE,authenticated:DELETE,authenticated:INSERT,authenticated:MAINTAIN,authenticated:REFERENCES,authenticated:SELECT,authenticated:TRIGGER,authenticated:TRUNCATE,authenticated:UPDATE'),
  ('colpriv', 'mall_builder_campaigns.id', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_campaigns.store_id', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_campaigns.channel', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_campaigns.is_ad', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_campaigns.subject', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_campaigns.body', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_campaigns.order_id', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_campaigns.target_count', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_campaigns.queued_count', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_campaigns.skipped', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_campaigns.created_by', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_campaigns.created_at', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_notifications.campaign_id', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_notify_templates.store_id', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_notify_templates.kind', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_notify_templates.channel', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_notify_templates.subject', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_notify_templates.body', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_notify_templates.updated_at', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_store_notify_settings.bulk_once', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_store_notify_settings.bulk_day', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_store_notify_settings.optout_text', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_store_notify_settings.extra_kinds', 'anon=siu authenticated=siu'),
  ('colpriv', 'mall_builder_store_notify_settings.extra_email_kinds', 'anon=siu authenticated=siu'),
  ('fn', 'mall_builder_private.fill_order_text(p_text text, p_order_id uuid)', 'true:search_path="":d3d5ec582c21a20eae4f142bd027f286'),
  ('fn', 'mall_builder_private.notifications_apply_template()', 'true:search_path="":fec891b01564ce4757704d509d809d94'),
  ('fn', 'mall_builder_private.order_events_enqueue_more()', 'true:search_path="":279aa1be321e41ab1c7328b1f3870959'),
  ('fn', 'mall_builder_private.kst_hour()', 'false:search_path="":3a2011e068c44e498927f928a4d0ed26'),
  ('fn', 'public.mall_builder_message_send(p_store_id uuid, p_channel text, p_is_ad boolean, p_subject text, p_body text, p_customer_ids uuid[], p_order_id uuid, p_dry_run boolean)', 'true:search_path="":5674ba99eba69754daca4d1fd8f76794'),
  ('fn', 'public.mall_builder_notify_template_save(p_store_id uuid, p_kind text, p_channel text, p_subject text, p_body text)', 'true:search_path="":c72f032525c6076e9734724e47f6bd29'),
  ('fn', 'public.mall_builder_message_settings_save(p_store_id uuid, p_bulk_once integer, p_bulk_day integer, p_optout text, p_extra_kinds text[], p_extra_email_kinds text[])', 'true:search_path="":c802d0bb9e9c4c6bf6d00ece16447c43'),
  ('fnexec', 'mall_builder_private.fill_order_text(p_text text, p_order_id uuid)', 'anon=false authenticated=false public_direct=0'),
  ('fnexec', 'mall_builder_private.notifications_apply_template()', 'anon=true authenticated=true public_direct=default'),
  ('fnexec', 'mall_builder_private.order_events_enqueue_more()', 'anon=true authenticated=true public_direct=default'),
  ('fnexec', 'mall_builder_private.kst_hour()', 'anon=true authenticated=true public_direct=default'),
  ('fnexec', 'public.mall_builder_message_send(p_store_id uuid, p_channel text, p_is_ad boolean, p_subject text, p_body text, p_customer_ids uuid[], p_order_id uuid, p_dry_run boolean)', 'anon=false authenticated=true public_direct=0'),
  ('fnexec', 'public.mall_builder_notify_template_save(p_store_id uuid, p_kind text, p_channel text, p_subject text, p_body text)', 'anon=false authenticated=true public_direct=0'),
  ('fnexec', 'public.mall_builder_message_settings_save(p_store_id uuid, p_bulk_once integer, p_bulk_day integer, p_optout text, p_extra_kinds text[], p_extra_email_kinds text[])', 'anon=false authenticated=true public_direct=0'),
  ('trg', 'mall_builder_notifications.mall_builder_notifications_template', 'O|7de4ab94edf4878136d6b4f5f0b9cb9d'),
  ('trg', 'mall_builder_order_events.mall_builder_order_events_enqueue_more', 'O|8b45590b37d1a0e36a9fbc1df7e4509f')) e(k, key, val)),
diff as (select e.k, e.key from exp e left join cur c using (k, key) where c.val is distinct from e.val),
chk as (
  select 1 o, '적용 기록: 이번 mall_builder_0101_messaging 각 1줄 · 선행 각 1줄 · 이후 0' 항목,
    '1/1/0' 기대,
    concat_ws('/', (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0101_messaging')::text, (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0100_cash_receipts')::text, ((select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0102_exchanges') + (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0103_exchange_confirmed_window') + (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0104_exchange_fee_payments'))::text) 실제
  union all select 2, '구조 92개(칸·제약·인덱스·정책·권한·함수 본문·트리거) = 기대 목록', '0', (select count(*) from diff)::text
  union all select 3, '어긋난 구조 키(최대 15개)', '없음', coalesce((select string_agg(k || ' ' || key, ' ; ') from (select * from diff order by k, key limit 15) d), '없음')
  union all select 4, '새 표 비어 있음(mall_builder_campaigns, mall_builder_notify_templates)', '0/0',
    concat_ws('/', (select count(*) from public.mall_builder_campaigns)::text, (select count(*) from public.mall_builder_notify_templates)::text)
), j as (select o, 항목, 기대, coalesce(실제, '(없음)') 실제 from chk)
select o 순서, 항목, 기대, 실제, case when 기대 = 실제 then 'OK' else '확인 필요' end 판정 from j
union all select 5, '전체', '4/4', (select count(*) filter (where 기대 = 실제) from j)::text || '/' || (select count(*) from j)::text,
  case when (select count(*) from j) = 4 and (select count(*) filter (where 기대 = 실제) from j) = 4 then 'OK' else '확인 필요' end
order by 1;
