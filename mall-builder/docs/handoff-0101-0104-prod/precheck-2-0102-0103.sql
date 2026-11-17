-- 운영 0102-0103 실행 전 확인(읽기 전용) — 「전체」가 OK일 때만 apply-2-0102-0103.sql
-- 대상: 운영 Supabase 「AIMaster」 ref esgxyikcnnvmlhygjkth 의 SQL 편집기만(화면 위 프로젝트 이름·주소 ref를 먼저 눈으로 확인). Lab(rjjtjakljjxsgjelqgek)은 이미 0101~0104가 있어 아래 조건에서 멈춘다.
-- 초안: Master 배정 + 주인님 승인 전에는 실행하지 않는다(B2B-20261118-02). 생성: build.mjs
-- 판정 줄 1~6, 기록 줄 7~9(판정 없음 — 실행 기록에 남김). 값이 비면(NULL) 「(없음)」으로 바꿔 불일치로 센다.
set search_path to "$user", public, extensions;
with chk as (
  select 1 o, '선행 적용 기록 각 1줄(mall_builder_0100_cash_receipts, mall_builder_0101_messaging)' 항목, '1/1' 기대,
    concat_ws('/', (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0100_cash_receipts')::text, (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0101_messaging')::text) 실제
  union all select 2, '이번·이후 적용 기록 없음(mall_builder_0102_exchanges, mall_builder_0103_exchange_confirmed_window, mall_builder_0104_exchange_fee_payments)', '0',
    ((select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0102_exchanges') + (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0103_exchange_confirmed_window') + (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0104_exchange_fee_payments'))::text
  union all select 3, '이번 단계가 만들 구조 109개 중 이미 있는 것 0(부분 적용·Lab 혼동 차단)', '0', (select count(*) from (select k, key, val from (
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
) s) s join (values ('col', 'mall_builder_exchanges.collect_courier'),
  ('col', 'mall_builder_exchanges.collect_tracking'),
  ('col', 'mall_builder_exchanges.created_at'),
  ('col', 'mall_builder_exchanges.created_by'),
  ('col', 'mall_builder_exchanges.fee'),
  ('col', 'mall_builder_exchanges.fee_paid_at'),
  ('col', 'mall_builder_exchanges.fee_status'),
  ('col', 'mall_builder_exchanges.from_option'),
  ('col', 'mall_builder_exchanges.from_option_based'),
  ('col', 'mall_builder_exchanges.from_variant_id'),
  ('col', 'mall_builder_exchanges.id'),
  ('col', 'mall_builder_exchanges.item_id'),
  ('col', 'mall_builder_exchanges.memo'),
  ('col', 'mall_builder_exchanges.order_id'),
  ('col', 'mall_builder_exchanges.qty'),
  ('col', 'mall_builder_exchanges.reason'),
  ('col', 'mall_builder_exchanges.reject_note'),
  ('col', 'mall_builder_exchanges.requested_by'),
  ('col', 'mall_builder_exchanges.reship_courier'),
  ('col', 'mall_builder_exchanges.reship_deducted'),
  ('col', 'mall_builder_exchanges.reship_tracking'),
  ('col', 'mall_builder_exchanges.restocked'),
  ('col', 'mall_builder_exchanges.step'),
  ('col', 'mall_builder_exchanges.store_id'),
  ('col', 'mall_builder_exchanges.to_option'),
  ('col', 'mall_builder_exchanges.to_option_based'),
  ('col', 'mall_builder_exchanges.to_variant_id'),
  ('col', 'mall_builder_exchanges.updated_at'),
  ('colpriv', 'mall_builder_exchanges.collect_courier'),
  ('colpriv', 'mall_builder_exchanges.collect_tracking'),
  ('colpriv', 'mall_builder_exchanges.created_at'),
  ('colpriv', 'mall_builder_exchanges.created_by'),
  ('colpriv', 'mall_builder_exchanges.fee'),
  ('colpriv', 'mall_builder_exchanges.fee_paid_at'),
  ('colpriv', 'mall_builder_exchanges.fee_status'),
  ('colpriv', 'mall_builder_exchanges.from_option'),
  ('colpriv', 'mall_builder_exchanges.from_option_based'),
  ('colpriv', 'mall_builder_exchanges.from_variant_id'),
  ('colpriv', 'mall_builder_exchanges.id'),
  ('colpriv', 'mall_builder_exchanges.item_id'),
  ('colpriv', 'mall_builder_exchanges.memo'),
  ('colpriv', 'mall_builder_exchanges.order_id'),
  ('colpriv', 'mall_builder_exchanges.qty'),
  ('colpriv', 'mall_builder_exchanges.reason'),
  ('colpriv', 'mall_builder_exchanges.reject_note'),
  ('colpriv', 'mall_builder_exchanges.requested_by'),
  ('colpriv', 'mall_builder_exchanges.reship_courier'),
  ('colpriv', 'mall_builder_exchanges.reship_deducted'),
  ('colpriv', 'mall_builder_exchanges.reship_tracking'),
  ('colpriv', 'mall_builder_exchanges.restocked'),
  ('colpriv', 'mall_builder_exchanges.step'),
  ('colpriv', 'mall_builder_exchanges.store_id'),
  ('colpriv', 'mall_builder_exchanges.to_option'),
  ('colpriv', 'mall_builder_exchanges.to_option_based'),
  ('colpriv', 'mall_builder_exchanges.to_variant_id'),
  ('colpriv', 'mall_builder_exchanges.updated_at'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_collect_courier_check'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_collect_tracking_check'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_fee_check'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_fee_status_check'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_from_option_check'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_from_variant_id_fkey'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_item_id_fkey'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_memo_check'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_order_id_fkey'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_pkey'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_qty_check'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_reason_check'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_reject_note_check'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_requested_by_check'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_reship_courier_check'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_reship_tracking_check'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_step_check'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_store_id_fkey'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_to_option_check'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_to_variant_id_fkey'),
  ('fn', 'mall_builder_private.delivered_at(p_order_id uuid)'),
  ('fn', 'mall_builder_private.exchange_event(p_order_id uuid, p_role text, p_note text)'),
  ('fn', 'mall_builder_private.exchange_order_delivered(p_order_id uuid)'),
  ('fn', 'mall_builder_private.exchange_order_status_ok(p_status text)'),
  ('fn', 'mall_builder_private.exchange_stock(p_product_id uuid, p_variant_id uuid, p_delta integer, p_label text)'),
  ('fn', 'mall_builder_private.lock_exchange(p_exchange_id uuid)'),
  ('fn', 'mall_builder_private.orders_exchange_guard()'),
  ('fn', 'mall_builder_private.variant_label(p_variant_id uuid)'),
  ('fn', 'public.mall_builder_exchange_fee(p_exchange_id uuid, p_fee bigint)'),
  ('fn', 'public.mall_builder_exchange_fee_paid(p_exchange_id uuid)'),
  ('fn', 'public.mall_builder_exchange_step(p_exchange_id uuid, p_step text, p_courier text, p_tracking text, p_note text)'),
  ('fn', 'public.mall_builder_request_exchange(p_item_id uuid, p_qty integer, p_to_variant_id uuid, p_reason text, p_memo text)'),
  ('fnexec', 'mall_builder_private.delivered_at(p_order_id uuid)'),
  ('fnexec', 'mall_builder_private.exchange_event(p_order_id uuid, p_role text, p_note text)'),
  ('fnexec', 'mall_builder_private.exchange_order_delivered(p_order_id uuid)'),
  ('fnexec', 'mall_builder_private.exchange_order_status_ok(p_status text)'),
  ('fnexec', 'mall_builder_private.exchange_stock(p_product_id uuid, p_variant_id uuid, p_delta integer, p_label text)'),
  ('fnexec', 'mall_builder_private.lock_exchange(p_exchange_id uuid)'),
  ('fnexec', 'mall_builder_private.orders_exchange_guard()'),
  ('fnexec', 'mall_builder_private.variant_label(p_variant_id uuid)'),
  ('fnexec', 'public.mall_builder_exchange_fee(p_exchange_id uuid, p_fee bigint)'),
  ('fnexec', 'public.mall_builder_exchange_fee_paid(p_exchange_id uuid)'),
  ('fnexec', 'public.mall_builder_exchange_step(p_exchange_id uuid, p_step text, p_courier text, p_tracking text, p_note text)'),
  ('fnexec', 'public.mall_builder_request_exchange(p_item_id uuid, p_qty integer, p_to_variant_id uuid, p_reason text, p_memo text)'),
  ('idx', 'mall_builder_exchanges.mall_builder_exchanges_open_item'),
  ('idx', 'mall_builder_exchanges.mall_builder_exchanges_order'),
  ('idx', 'mall_builder_exchanges.mall_builder_exchanges_pkey'),
  ('idx', 'mall_builder_exchanges.mall_builder_exchanges_store'),
  ('pol', 'mall_builder_exchanges.mall_builder_exchanges_read'),
  ('polcount', 'mall_builder_exchanges'),
  ('rls', 'mall_builder_exchanges'),
  ('tblpriv', 'mall_builder_exchanges'),
  ('trg', 'mall_builder_orders.mall_builder_orders_exchange_guard')) e(k, key) using (k, key))::text
  union all select 4, '필요한 확장(없음)', '-',
    '-'
  union all select 5, 'DB 시간대 UTC(적용 기록 version은 UTC)', 'UTC', current_setting('TimeZone')
  union all select 6, '의존 함수 1개 정확한 서명·실행 권한 그대로(public.mall_builder_staff_can(p_store_id uuid, p_perm text))', '1', (select count(*) from (select k, key, val from (
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
) s) s join (values ('public.mall_builder_staff_can(p_store_id uuid, p_perm text)', 'anon=true authenticated=true public_direct=1')) d(key, val) on s.k = 'fnexec' and s.key = d.key and s.val = d.val)::text
), j as (select o, 항목, 기대, coalesce(실제, '(없음)') 실제 from chk)
select o 순서, 항목, 기대, 실제, case when 기대 = 실제 then 'OK' else '확인 필요' end 판정 from j
union all select 7, '기록: lab_admin 스키마 있음(Lab이면 보통 true — 판정 아님, 3번이 실제 차단)', '-', (to_regnamespace('lab_admin') is not null)::text, '기록'
union all select 8, '기록: 쇼핑몰 표 수·전체 행 수(적용 전 기준, 적용 파일이 같은 트랜잭션에서 다시 비교)', '-',
  (select count(*) || ' 표 / ' || coalesce(sum(n_live_tup), 0) || ' 행(통계 추정)' from pg_stat_user_tables where schemaname = 'public' and relname like 'mall\_builder\_%'), '기록'
union all select 9, '기록: Postgres 판', '-', current_setting('server_version'), '기록'
union all select 10, '전체', '6/6', (select count(*) filter (where 기대 = 실제) from j)::text || '/' || (select count(*) from j)::text,
  case when (select count(*) from j) = 6 and (select count(*) filter (where 기대 = 실제) from j) = 6 then 'OK' else '확인 필요' end
order by 1;
