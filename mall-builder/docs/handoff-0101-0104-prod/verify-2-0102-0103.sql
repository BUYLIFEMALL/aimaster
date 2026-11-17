-- 운영 0102-0103 적용 확인(읽기 전용) — 「전체」 OK면 성공
-- 대상: 운영 Supabase 「AIMaster」 ref esgxyikcnnvmlhygjkth 의 SQL 편집기만(화면 위 프로젝트 이름·주소 ref를 먼저 눈으로 확인). Lab(rjjtjakljjxsgjelqgek)은 이미 0101~0104가 있어 아래 조건에서 멈춘다.
-- 초안: Master 배정 + 주인님 승인 전에는 실행하지 않는다(B2B-20261118-02). 생성: build.mjs
-- 구조 109개를 고정 원문에서 나온 기대 목록(manifest.json, 격리 DB PG 17.11)과 그대로 대조한다(정규화 없음). 어긋나면 3번에 키를 보여 준다.
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
exp as (select * from (values ('col', 'mall_builder_exchanges.id', 'uuid NN D=gen_random_uuid()'),
  ('col', 'mall_builder_exchanges.store_id', 'uuid NN'),
  ('col', 'mall_builder_exchanges.order_id', 'uuid NN'),
  ('col', 'mall_builder_exchanges.item_id', 'uuid NN'),
  ('col', 'mall_builder_exchanges.qty', 'integer NN'),
  ('col', 'mall_builder_exchanges.from_variant_id', 'uuid'),
  ('col', 'mall_builder_exchanges.to_variant_id', 'uuid'),
  ('col', 'mall_builder_exchanges.from_option', 'text NN D=''''::text'),
  ('col', 'mall_builder_exchanges.to_option', 'text NN D=''''::text'),
  ('col', 'mall_builder_exchanges.reason', 'text NN'),
  ('col', 'mall_builder_exchanges.memo', 'text NN D=''''::text'),
  ('col', 'mall_builder_exchanges.requested_by', 'text NN'),
  ('col', 'mall_builder_exchanges.step', 'text NN D=''requested''::text'),
  ('col', 'mall_builder_exchanges.collect_courier', 'text NN D=''''::text'),
  ('col', 'mall_builder_exchanges.collect_tracking', 'text NN D=''''::text'),
  ('col', 'mall_builder_exchanges.reship_courier', 'text NN D=''''::text'),
  ('col', 'mall_builder_exchanges.reship_tracking', 'text NN D=''''::text'),
  ('col', 'mall_builder_exchanges.fee', 'bigint NN D=0'),
  ('col', 'mall_builder_exchanges.fee_status', 'text NN D=''none''::text'),
  ('col', 'mall_builder_exchanges.fee_paid_at', 'timestamp with time zone'),
  ('col', 'mall_builder_exchanges.from_option_based', 'boolean NN D=false'),
  ('col', 'mall_builder_exchanges.to_option_based', 'boolean NN D=false'),
  ('col', 'mall_builder_exchanges.restocked', 'boolean NN D=false'),
  ('col', 'mall_builder_exchanges.reship_deducted', 'boolean NN D=false'),
  ('col', 'mall_builder_exchanges.reject_note', 'text NN D=''''::text'),
  ('col', 'mall_builder_exchanges.created_by', 'uuid'),
  ('col', 'mall_builder_exchanges.created_at', 'timestamp with time zone NN D=now()'),
  ('col', 'mall_builder_exchanges.updated_at', 'timestamp with time zone NN D=now()'),
  ('rls', 'mall_builder_exchanges', 'true'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_qty_check', 'c:CHECK (((qty >= 1) AND (qty <= 999)))'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_from_option_check', 'c:CHECK ((char_length(from_option) <= 200))'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_to_option_check', 'c:CHECK ((char_length(to_option) <= 200))'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_reason_check', 'c:CHECK ((reason = ANY (ARRAY[''size''::text, ''change_mind''::text, ''defect''::text, ''wrong_item''::text, ''other''::text])))'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_memo_check', 'c:CHECK ((char_length(memo) <= 300))'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_requested_by_check', 'c:CHECK ((requested_by = ANY (ARRAY[''customer''::text, ''staff''::text])))'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_step_check', 'c:CHECK ((step = ANY (ARRAY[''requested''::text, ''collecting''::text, ''collected''::text, ''reshipped''::text, ''done''::text, ''rejected''::text])))'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_collect_courier_check', 'c:CHECK ((char_length(collect_courier) <= 30))'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_collect_tracking_check', 'c:CHECK ((char_length(collect_tracking) <= 40))'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_reship_courier_check', 'c:CHECK ((char_length(reship_courier) <= 30))'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_reship_tracking_check', 'c:CHECK ((char_length(reship_tracking) <= 40))'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_fee_check', 'c:CHECK (((fee >= 0) AND (fee <= 10000000)))'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_fee_status_check', 'c:CHECK ((fee_status = ANY (ARRAY[''none''::text, ''waiting''::text, ''paid''::text])))'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_reject_note_check', 'c:CHECK ((char_length(reject_note) <= 300))'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_pkey', 'p:PRIMARY KEY (id)'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_store_id_fkey', 'f:FOREIGN KEY (store_id) REFERENCES mall_builder_stores(id) ON DELETE CASCADE'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_order_id_fkey', 'f:FOREIGN KEY (order_id) REFERENCES mall_builder_orders(id) ON DELETE CASCADE'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_item_id_fkey', 'f:FOREIGN KEY (item_id) REFERENCES mall_builder_order_items(id) ON DELETE CASCADE'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_from_variant_id_fkey', 'f:FOREIGN KEY (from_variant_id) REFERENCES mall_builder_product_variants(id) ON DELETE SET NULL'),
  ('con', 'mall_builder_exchanges.mall_builder_exchanges_to_variant_id_fkey', 'f:FOREIGN KEY (to_variant_id) REFERENCES mall_builder_product_variants(id) ON DELETE SET NULL'),
  ('idx', 'mall_builder_exchanges.mall_builder_exchanges_pkey', '71246a8b7c786e69f85cc5572a5fbce2'),
  ('idx', 'mall_builder_exchanges.mall_builder_exchanges_store', '20fe9536a269d4d4fabd902a9f8cab48'),
  ('idx', 'mall_builder_exchanges.mall_builder_exchanges_order', '15755ec9aad59b621f211a8cee85f0da'),
  ('idx', 'mall_builder_exchanges.mall_builder_exchanges_open_item', '305b28d589e9924616a5ceafd4285e11'),
  ('polcount', 'mall_builder_exchanges', '1'),
  ('pol', 'mall_builder_exchanges.mall_builder_exchanges_read', 'r:permissive:authenticated:943e922ce2518a5aa72cab09bb19e659:-'),
  ('tblpriv', 'mall_builder_exchanges', 'anon=str authenticated=str | direct=anon:MAINTAIN,anon:REFERENCES,anon:SELECT,anon:TRIGGER,anon:TRUNCATE,authenticated:MAINTAIN,authenticated:REFERENCES,authenticated:SELECT,authenticated:TRIGGER,authenticated:TRUNCATE'),
  ('colpriv', 'mall_builder_exchanges.id', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.store_id', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.order_id', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.item_id', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.qty', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.from_variant_id', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.to_variant_id', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.from_option', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.to_option', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.reason', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.memo', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.requested_by', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.step', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.collect_courier', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.collect_tracking', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.reship_courier', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.reship_tracking', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.fee', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.fee_status', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.fee_paid_at', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.from_option_based', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.to_option_based', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.restocked', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.reship_deducted', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.reject_note', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.created_by', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.created_at', 'anon=s authenticated=s'),
  ('colpriv', 'mall_builder_exchanges.updated_at', 'anon=s authenticated=s'),
  ('fn', 'public.mall_builder_exchange_step(p_exchange_id uuid, p_step text, p_courier text, p_tracking text, p_note text)', 'true:search_path="":57dfd3edab0f2bc039762122cb6cfa07'),
  ('fn', 'mall_builder_private.delivered_at(p_order_id uuid)', 'false:search_path="":9857620fb340e45b81833bd7a0f20148'),
  ('fn', 'mall_builder_private.variant_label(p_variant_id uuid)', 'false:search_path="":89d65980cb138dd3148583f1c0b280b8'),
  ('fn', 'mall_builder_private.exchange_event(p_order_id uuid, p_role text, p_note text)', 'false:search_path="":e493c1f5841352310411ed67a4f9b0ba'),
  ('fn', 'public.mall_builder_request_exchange(p_item_id uuid, p_qty integer, p_to_variant_id uuid, p_reason text, p_memo text)', 'true:search_path="":2a97aa32f8822317e3416a5eb0d70c62'),
  ('fn', 'mall_builder_private.lock_exchange(p_exchange_id uuid)', 'false:search_path="":b0f4d7b9d3a204b8ff20eb513e4aaf95'),
  ('fn', 'mall_builder_private.exchange_stock(p_product_id uuid, p_variant_id uuid, p_delta integer, p_label text)', 'false:search_path="":99081df11e95c8b7bee69dc227b95612'),
  ('fn', 'public.mall_builder_exchange_fee_paid(p_exchange_id uuid)', 'true:search_path="":c2f070559f44154bdae584683d07409c'),
  ('fn', 'mall_builder_private.exchange_order_delivered(p_order_id uuid)', 'false:search_path="":1e1e3aaa5e50f60bd6a833096b0af72e'),
  ('fn', 'public.mall_builder_exchange_fee(p_exchange_id uuid, p_fee bigint)', 'true:search_path="":2e6eae0b59dd555ddb988d53d74d5c76'),
  ('fn', 'mall_builder_private.exchange_order_status_ok(p_status text)', 'false:search_path="":aa1ee4ce118410d3d6464779b7085c00'),
  ('fn', 'mall_builder_private.orders_exchange_guard()', 'true:search_path="":c14dab37465b67c4f160f81b2fd03387'),
  ('fnexec', 'public.mall_builder_exchange_step(p_exchange_id uuid, p_step text, p_courier text, p_tracking text, p_note text)', 'anon=false authenticated=true public_direct=0'),
  ('fnexec', 'mall_builder_private.delivered_at(p_order_id uuid)', 'anon=false authenticated=false public_direct=0'),
  ('fnexec', 'mall_builder_private.variant_label(p_variant_id uuid)', 'anon=false authenticated=false public_direct=0'),
  ('fnexec', 'mall_builder_private.exchange_event(p_order_id uuid, p_role text, p_note text)', 'anon=false authenticated=false public_direct=0'),
  ('fnexec', 'public.mall_builder_request_exchange(p_item_id uuid, p_qty integer, p_to_variant_id uuid, p_reason text, p_memo text)', 'anon=false authenticated=true public_direct=0'),
  ('fnexec', 'mall_builder_private.lock_exchange(p_exchange_id uuid)', 'anon=false authenticated=false public_direct=0'),
  ('fnexec', 'mall_builder_private.exchange_stock(p_product_id uuid, p_variant_id uuid, p_delta integer, p_label text)', 'anon=false authenticated=false public_direct=0'),
  ('fnexec', 'public.mall_builder_exchange_fee_paid(p_exchange_id uuid)', 'anon=false authenticated=true public_direct=0'),
  ('fnexec', 'mall_builder_private.exchange_order_delivered(p_order_id uuid)', 'anon=false authenticated=false public_direct=0'),
  ('fnexec', 'public.mall_builder_exchange_fee(p_exchange_id uuid, p_fee bigint)', 'anon=false authenticated=true public_direct=0'),
  ('fnexec', 'mall_builder_private.exchange_order_status_ok(p_status text)', 'anon=false authenticated=false public_direct=0'),
  ('fnexec', 'mall_builder_private.orders_exchange_guard()', 'anon=false authenticated=false public_direct=0'),
  ('trg', 'mall_builder_orders.mall_builder_orders_exchange_guard', 'O|a940cb72555fa94696ff921770f78cfa')) e(k, key, val)),
diff as (select e.k, e.key from exp e left join cur c using (k, key) where c.val is distinct from e.val),
chk as (
  select 1 o, '적용 기록: 이번 mall_builder_0102_exchanges, mall_builder_0103_exchange_confirmed_window 각 1줄 · 선행 각 1줄 · 이후 0' 항목,
    '1/1/1/1/0' 기대,
    concat_ws('/', (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0102_exchanges')::text, (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0103_exchange_confirmed_window')::text, (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0100_cash_receipts')::text, (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0101_messaging')::text, ((select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0104_exchange_fee_payments'))::text) 실제
  union all select 2, '구조 109개(칸·제약·인덱스·정책·권한·함수 본문·트리거) = 기대 목록', '0', (select count(*) from diff)::text
  union all select 3, '어긋난 구조 키(최대 15개)', '없음', coalesce((select string_agg(k || ' ' || key, ' ; ') from (select * from diff order by k, key limit 15) d), '없음')
  union all select 4, '새 표 비어 있음(mall_builder_exchanges)', '0',
    concat_ws('/', (select count(*) from public.mall_builder_exchanges)::text)
), j as (select o, 항목, 기대, coalesce(실제, '(없음)') 실제 from chk)
select o 순서, 항목, 기대, 실제, case when 기대 = 실제 then 'OK' else '확인 필요' end 판정 from j
union all select 5, '전체', '4/4', (select count(*) filter (where 기대 = 실제) from j)::text || '/' || (select count(*) from j)::text,
  case when (select count(*) from j) = 4 and (select count(*) filter (where 기대 = 실제) from j) = 4 then 'OK' else '확인 필요' end
order by 1;
