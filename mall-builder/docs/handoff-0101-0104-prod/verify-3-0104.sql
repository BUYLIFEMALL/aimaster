-- 운영 0104 적용 확인(읽기 전용) — 「전체」 OK면 성공
-- 대상: 운영 Supabase 「AIMaster」 ref esgxyikcnnvmlhygjkth 의 SQL 편집기만(화면 위 프로젝트 이름·주소 ref를 먼저 눈으로 확인). Lab(rjjtjakljjxsgjelqgek)은 이미 0101~0104가 있어 아래 조건에서 멈춘다.
-- 초안: Master 배정 + 주인님 승인 전에는 실행하지 않는다(B2B-20261118-02). 생성: build.mjs
-- 구조 117개를 고정 원문에서 나온 기대 목록(manifest.json, 격리 DB PG 17.11)과 그대로 대조한다(정규화 없음). 어긋나면 3번에 키를 보여 준다.
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
exp as (select * from (values ('col', 'mall_builder_exchange_fee_payment_attempts.amount', 'bigint NN'),
  ('col', 'mall_builder_exchange_fee_payment_attempts.approved_at', 'timestamp with time zone'),
  ('col', 'mall_builder_exchange_fee_payment_attempts.archived_at', 'timestamp with time zone NN D=now()'),
  ('col', 'mall_builder_exchange_fee_payment_attempts.archived_by', 'uuid'),
  ('col', 'mall_builder_exchange_fee_payment_attempts.error', 'text NN D=''''::text'),
  ('col', 'mall_builder_exchange_fee_payment_attempts.exchange_id', 'uuid NN'),
  ('col', 'mall_builder_exchange_fee_payment_attempts.id', 'uuid NN D=gen_random_uuid()'),
  ('col', 'mall_builder_exchange_fee_payment_attempts.idempotency_key', 'text NN'),
  ('col', 'mall_builder_exchange_fee_payment_attempts.method', 'text NN D=''''::text'),
  ('col', 'mall_builder_exchange_fee_payment_attempts.order_id', 'uuid NN'),
  ('col', 'mall_builder_exchange_fee_payment_attempts.payment_id', 'uuid NN'),
  ('col', 'mall_builder_exchange_fee_payment_attempts.payment_key', 'text NN'),
  ('col', 'mall_builder_exchange_fee_payment_attempts.prepared_at', 'timestamp with time zone'),
  ('col', 'mall_builder_exchange_fee_payment_attempts.reason', 'text NN'),
  ('col', 'mall_builder_exchange_fee_payment_attempts.receipt_url', 'text NN D=''''::text'),
  ('col', 'mall_builder_exchange_fee_payment_attempts.requested_at', 'timestamp with time zone'),
  ('col', 'mall_builder_exchange_fee_payment_attempts.status', 'text NN'),
  ('col', 'mall_builder_exchange_fee_payment_attempts.store_id', 'uuid NN'),
  ('col', 'mall_builder_exchange_fee_payment_attempts.toss_order_id', 'text NN'),
  ('col', 'mall_builder_exchange_fee_payments.amount', 'bigint NN'),
  ('col', 'mall_builder_exchange_fee_payments.approved_at', 'timestamp with time zone'),
  ('col', 'mall_builder_exchange_fee_payments.created_at', 'timestamp with time zone NN D=now()'),
  ('col', 'mall_builder_exchange_fee_payments.error', 'text NN D=''''::text'),
  ('col', 'mall_builder_exchange_fee_payments.exchange_id', 'uuid NN'),
  ('col', 'mall_builder_exchange_fee_payments.id', 'uuid NN D=gen_random_uuid()'),
  ('col', 'mall_builder_exchange_fee_payments.idempotency_key', 'text NN D=''''::text'),
  ('col', 'mall_builder_exchange_fee_payments.method', 'text NN D=''''::text'),
  ('col', 'mall_builder_exchange_fee_payments.needs_review', 'boolean NN D=false'),
  ('col', 'mall_builder_exchange_fee_payments.order_id', 'uuid NN'),
  ('col', 'mall_builder_exchange_fee_payments.payment_key', 'text NN D=''''::text'),
  ('col', 'mall_builder_exchange_fee_payments.prepared_at', 'timestamp with time zone NN D=now()'),
  ('col', 'mall_builder_exchange_fee_payments.receipt_url', 'text NN D=''''::text'),
  ('col', 'mall_builder_exchange_fee_payments.requested_at', 'timestamp with time zone'),
  ('col', 'mall_builder_exchange_fee_payments.status', 'text NN D=''prepared''::text'),
  ('col', 'mall_builder_exchange_fee_payments.store_id', 'uuid NN'),
  ('col', 'mall_builder_exchange_fee_payments.toss_order_id', 'text NN'),
  ('col', 'mall_builder_exchange_fee_payments.updated_at', 'timestamp with time zone NN D=now()'),
  ('colpriv', 'mall_builder_exchange_fee_payment_attempts.amount', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payment_attempts.approved_at', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payment_attempts.archived_at', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payment_attempts.archived_by', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payment_attempts.error', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payment_attempts.exchange_id', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payment_attempts.id', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payment_attempts.idempotency_key', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payment_attempts.method', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payment_attempts.order_id', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payment_attempts.payment_id', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payment_attempts.payment_key', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payment_attempts.prepared_at', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payment_attempts.reason', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payment_attempts.receipt_url', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payment_attempts.requested_at', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payment_attempts.status', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payment_attempts.store_id', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payment_attempts.toss_order_id', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payments.amount', 'anon= authenticated=s'),
  ('colpriv', 'mall_builder_exchange_fee_payments.approved_at', 'anon= authenticated=s'),
  ('colpriv', 'mall_builder_exchange_fee_payments.created_at', 'anon= authenticated=s'),
  ('colpriv', 'mall_builder_exchange_fee_payments.error', 'anon= authenticated=s'),
  ('colpriv', 'mall_builder_exchange_fee_payments.exchange_id', 'anon= authenticated=s'),
  ('colpriv', 'mall_builder_exchange_fee_payments.id', 'anon= authenticated=s'),
  ('colpriv', 'mall_builder_exchange_fee_payments.idempotency_key', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payments.method', 'anon= authenticated=s'),
  ('colpriv', 'mall_builder_exchange_fee_payments.needs_review', 'anon= authenticated=s'),
  ('colpriv', 'mall_builder_exchange_fee_payments.order_id', 'anon= authenticated=s'),
  ('colpriv', 'mall_builder_exchange_fee_payments.payment_key', 'anon= authenticated='),
  ('colpriv', 'mall_builder_exchange_fee_payments.prepared_at', 'anon= authenticated=s'),
  ('colpriv', 'mall_builder_exchange_fee_payments.receipt_url', 'anon= authenticated=s'),
  ('colpriv', 'mall_builder_exchange_fee_payments.requested_at', 'anon= authenticated=s'),
  ('colpriv', 'mall_builder_exchange_fee_payments.status', 'anon= authenticated=s'),
  ('colpriv', 'mall_builder_exchange_fee_payments.store_id', 'anon= authenticated=s'),
  ('colpriv', 'mall_builder_exchange_fee_payments.toss_order_id', 'anon= authenticated=s'),
  ('colpriv', 'mall_builder_exchange_fee_payments.updated_at', 'anon= authenticated=s'),
  ('con', 'mall_builder_exchange_fee_payment_attempts.mall_builder_exchange_fee_payment_attempts_exchange_id_fkey', 'f:FOREIGN KEY (exchange_id) REFERENCES mall_builder_exchanges(id) ON DELETE CASCADE'),
  ('con', 'mall_builder_exchange_fee_payment_attempts.mall_builder_exchange_fee_payment_attempts_order_id_fkey', 'f:FOREIGN KEY (order_id) REFERENCES mall_builder_orders(id) ON DELETE CASCADE'),
  ('con', 'mall_builder_exchange_fee_payment_attempts.mall_builder_exchange_fee_payment_attempts_payment_id_fkey', 'f:FOREIGN KEY (payment_id) REFERENCES mall_builder_exchange_fee_payments(id) ON DELETE CASCADE'),
  ('con', 'mall_builder_exchange_fee_payment_attempts.mall_builder_exchange_fee_payment_attempts_pkey', 'p:PRIMARY KEY (id)'),
  ('con', 'mall_builder_exchange_fee_payment_attempts.mall_builder_exchange_fee_payment_attempts_reason_check', 'c:CHECK ((reason = ANY (ARRAY[''replaced_failed''::text, ''toss_canceled''::text, ''toss_partial_canceled''::text])))'),
  ('con', 'mall_builder_exchange_fee_payment_attempts.mall_builder_exchange_fee_payment_attempts_store_id_fkey', 'f:FOREIGN KEY (store_id) REFERENCES mall_builder_stores(id) ON DELETE CASCADE'),
  ('con', 'mall_builder_exchange_fee_payments.mall_builder_exchange_fee_payments_amount_check', 'c:CHECK ((amount > 0))'),
  ('con', 'mall_builder_exchange_fee_payments.mall_builder_exchange_fee_payments_exchange_id_fkey', 'f:FOREIGN KEY (exchange_id) REFERENCES mall_builder_exchanges(id) ON DELETE CASCADE'),
  ('con', 'mall_builder_exchange_fee_payments.mall_builder_exchange_fee_payments_exchange_id_key', 'u:UNIQUE (exchange_id)'),
  ('con', 'mall_builder_exchange_fee_payments.mall_builder_exchange_fee_payments_order_id_fkey', 'f:FOREIGN KEY (order_id) REFERENCES mall_builder_orders(id) ON DELETE CASCADE'),
  ('con', 'mall_builder_exchange_fee_payments.mall_builder_exchange_fee_payments_pkey', 'p:PRIMARY KEY (id)'),
  ('con', 'mall_builder_exchange_fee_payments.mall_builder_exchange_fee_payments_status_check', 'c:CHECK ((status = ANY (ARRAY[''prepared''::text, ''requested''::text, ''done''::text, ''failed''::text, ''unknown''::text, ''canceled''::text])))'),
  ('con', 'mall_builder_exchange_fee_payments.mall_builder_exchange_fee_payments_store_id_fkey', 'f:FOREIGN KEY (store_id) REFERENCES mall_builder_stores(id) ON DELETE CASCADE'),
  ('con', 'mall_builder_exchange_fee_payments.mall_builder_exchange_fee_payments_toss_order_id_check', 'c:CHECK ((toss_order_id ~ ''^exfee-[0-9a-f-]{36}$''::text))'),
  ('con', 'mall_builder_exchange_fee_payments.mall_builder_exchange_fee_payments_toss_order_id_key', 'u:UNIQUE (toss_order_id)'),
  ('fn', 'mall_builder_private.exchange_fee_attempt_archive(p_payment_id uuid, p_reason text)', 'false:search_path="":773f07ad0246992ccc6fdae127c97a69'),
  ('fn', 'mall_builder_private.exchange_fee_card_hold_canceled(p_payment_id uuid, p_toss_status text)', 'false:search_path="":97299e827a85130cbc5e77207d1b40ae'),
  ('fn', 'mall_builder_private.exchange_fee_mark_card_paid(p_exchange_id uuid, p_method text, p_role text)', 'false:search_path="":d25bb69d6cffacabac1e33798283f4a2'),
  ('fn', 'mall_builder_private.exchanges_fee_card_guard()', 'true:search_path="":50e0c1c3f04784c38675e99c003ae70a'),
  ('fn', 'public.mall_builder_exchange_fee_card_confirm(p_exchange_id uuid, p_payment_key text)', 'true:search_path="":ec9176dbfc102ca0754643241e9d190d'),
  ('fn', 'public.mall_builder_exchange_fee_card_prepare(p_exchange_id uuid, p_payment_key text, p_amount bigint)', 'true:search_path="":47b931231822b200959b2366f7d19fd6'),
  ('fn', 'public.mall_builder_exchange_fee_card_recheck(p_exchange_id uuid)', 'true:search_path="":01b43b665c05d4f1f2f71086d41c5494'),
  ('fnexec', 'mall_builder_private.exchange_fee_attempt_archive(p_payment_id uuid, p_reason text)', 'anon=false authenticated=false public_direct=0'),
  ('fnexec', 'mall_builder_private.exchange_fee_card_hold_canceled(p_payment_id uuid, p_toss_status text)', 'anon=false authenticated=false public_direct=0'),
  ('fnexec', 'mall_builder_private.exchange_fee_mark_card_paid(p_exchange_id uuid, p_method text, p_role text)', 'anon=false authenticated=false public_direct=0'),
  ('fnexec', 'mall_builder_private.exchanges_fee_card_guard()', 'anon=false authenticated=false public_direct=0'),
  ('fnexec', 'public.mall_builder_exchange_fee_card_confirm(p_exchange_id uuid, p_payment_key text)', 'anon=false authenticated=true public_direct=0'),
  ('fnexec', 'public.mall_builder_exchange_fee_card_prepare(p_exchange_id uuid, p_payment_key text, p_amount bigint)', 'anon=false authenticated=true public_direct=0'),
  ('fnexec', 'public.mall_builder_exchange_fee_card_recheck(p_exchange_id uuid)', 'anon=false authenticated=true public_direct=0'),
  ('idx', 'mall_builder_exchange_fee_payment_attempts.mall_builder_exchange_fee_payment_attempts_payment', 'a35958b1d1a4f34ace1f619d77d622aa'),
  ('idx', 'mall_builder_exchange_fee_payment_attempts.mall_builder_exchange_fee_payment_attempts_pkey', '533572722b6cb9304da6d0de1eed7ba8'),
  ('idx', 'mall_builder_exchange_fee_payments.mall_builder_exchange_fee_payments_exchange_id_key', '13050be69cbf839b48055727beb1ecf4'),
  ('idx', 'mall_builder_exchange_fee_payments.mall_builder_exchange_fee_payments_order', '2cc070a25bb91471a5291ef4dbbff63f'),
  ('idx', 'mall_builder_exchange_fee_payments.mall_builder_exchange_fee_payments_pkey', '0ec099bbbb7e54831d039041c64cb78b'),
  ('idx', 'mall_builder_exchange_fee_payments.mall_builder_exchange_fee_payments_toss_order_id_key', 'e9943d476ab70f1002ae159a0eb0c02f'),
  ('pol', 'mall_builder_exchange_fee_payments.mall_builder_exchange_fee_payments_read', 'r:permissive:authenticated:be5456c1963d9d605fc4e16d3f384b8e:-'),
  ('polcount', 'mall_builder_exchange_fee_payment_attempts', '0'),
  ('polcount', 'mall_builder_exchange_fee_payments', '1'),
  ('rls', 'mall_builder_exchange_fee_payment_attempts', 'true'),
  ('rls', 'mall_builder_exchange_fee_payments', 'true'),
  ('tblpriv', 'mall_builder_exchange_fee_payment_attempts', 'anon= authenticated= | direct=-'),
  ('tblpriv', 'mall_builder_exchange_fee_payments', 'anon= authenticated= | direct=-'),
  ('trg', 'mall_builder_exchanges.mall_builder_exchanges_fee_card_guard', 'O|8bb75b59b481193b2ceee341aee903ae')) e(k, key, val)),
diff as (select e.k, e.key from exp e left join cur c using (k, key) where c.val is distinct from e.val),
chk as (
  select 1 o, '적용 기록: 이번 mall_builder_0104_exchange_fee_payments 각 1줄 · 선행 각 1줄 · 이후 0' 항목,
    '1/1/1/1/1/0' 기대,
    concat_ws('/', (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0104_exchange_fee_payments')::text, (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0100_cash_receipts')::text, (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0101_messaging')::text, (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0102_exchanges')::text, (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0103_exchange_confirmed_window')::text, (0)::text) 실제
  union all select 2, '구조 117개(칸·제약·인덱스·정책·권한·함수 본문·트리거) = 기대 목록', '0', (select count(*) from diff)::text
  union all select 3, '어긋난 구조 키(최대 15개)', '없음', coalesce((select string_agg(k || ' ' || key, ' ; ') from (select * from diff order by k, key limit 15) d), '없음')
  union all select 4, '새 표 비어 있음(mall_builder_exchange_fee_payment_attempts, mall_builder_exchange_fee_payments)', '0/0',
    concat_ws('/', (select count(*) from public.mall_builder_exchange_fee_payment_attempts)::text, (select count(*) from public.mall_builder_exchange_fee_payments)::text)
), j as (select o, 항목, 기대, coalesce(실제, '(없음)') 실제 from chk)
select o 순서, 항목, 기대, 실제, case when 기대 = 실제 then 'OK' else '확인 필요' end 판정 from j
union all select 5, '전체', '4/4', (select count(*) filter (where 기대 = 실제) from j)::text || '/' || (select count(*) from j)::text,
  case when (select count(*) from j) = 4 and (select count(*) filter (where 기대 = 실제) from j) = 4 then 'OK' else '확인 필요' end
order by 1;
