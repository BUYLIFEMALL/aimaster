-- Lab 0104 적용 확인(읽기 전용) — apply.sql 뒤. 마지막 줄 「전체」가 OK면 성공
-- 엄격 판정: 값이 비면(NULL)·필요한 줄이 없으면 「(없음)」으로 바꿔 불일치로 센다. 「전체」는 줄 수가 정확히 20이고 20개 모두 일치할 때만 OK.
-- 구조 1~15: 고정 0104 원문(739b35e9…)을 격리 DB(Postgres 17)에 적용해 뽑은 카탈로그 목록(README 12절)과 칸 형식·NOT NULL·기본값·제약·정책·권한·함수·트리거를 그대로 대조.
-- 권한은 실제 효력(has_*_privilege)과 직접 부여 목록(aclexplode, PUBLIC·anon·authenticated)을 함께 본다. 소유자 이름은 비교하지 않는다(Lab과 다를 수 있음).
-- 자료 16~20: 결제 기록·시도 이력 0줄, 기존 자료가 precheck와 같음. 제약·정책 글자는 search_path에 따라 스키마 표기가 달라지므로 맨 위에서 고정한다(이 세션에만 적용).
set search_path to "$user", public, extensions;
with r(n) as (values ('anon'), ('authenticated')), roles as (select 0::oid g union all select oid from pg_roles where rolname in ('anon', 'authenticated')),
pay as (select to_regclass('public.mall_builder_exchange_fee_payments') t), att as (select to_regclass('public.mall_builder_exchange_fee_payment_attempts') t),
cols as (
  select a.attrelid, string_agg(a.attname || ' ' || format_type(a.atttypid, a.atttypmod) || case when a.attnotnull then ' NN' else '' end || coalesce(' D=' || pg_get_expr(d.adbin, d.adrelid), ''), ', ' order by a.attnum) s
  from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where a.attrelid in ((select t from pay), (select t from att)) and a.attnum > 0 and not a.attisdropped group by a.attrelid
),
cons as (select conrelid, string_agg(conname || ':' || contype::text || ':' || pg_get_constraintdef(oid), ' ; ' order by conname) s
  from pg_constraint where conrelid in ((select t from pay), (select t from att)) group by conrelid),
fns as (select p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) args, p.prosecdef, coalesce(array_to_string(p.proconfig, ','), '-') cfg, p.proacl
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where (n.nspname = 'public' and p.proname in ('mall_builder_exchange_fee_card_prepare', 'mall_builder_exchange_fee_card_confirm', 'mall_builder_exchange_fee_card_recheck'))
     or (n.nspname = 'mall_builder_private' and p.proname in ('exchange_fee_attempt_archive', 'exchanges_fee_card_guard', 'exchange_fee_mark_card_paid', 'exchange_fee_card_hold_canceled'))),
chk as (
  select 1 o, '0104 적용 기록 1줄' 항목, '1' 기대, (select count(*) from supabase_migrations.schema_migrations where name = 'mall_builder_0104_exchange_fee_payments')::text 실제
  union all select 2, '0102·0103 기록 각 1줄(그대로)', '1/1',
    (select count(*) filter (where name = 'mall_builder_0102_exchanges') || '/' || count(*) filter (where name = 'mall_builder_0103_exchange_confirmed_window') from supabase_migrations.schema_migrations)
  union all select 3, '표 2개 있음·보안 규칙(RLS) 켜짐', 'true/true',
    (select c1.relrowsecurity::text from pg_class c1 where c1.oid = (select t from pay)) || '/' || (select c2.relrowsecurity::text from pg_class c2 where c2.oid = (select t from att))
  union all select 4, '결제 기록 칸 형식·NOT NULL·기본값 = 목록',
    'id uuid NN D=gen_random_uuid(), exchange_id uuid NN, store_id uuid NN, order_id uuid NN, toss_order_id text NN, payment_key text NN D=''''::text, amount bigint NN, status text NN D=''prepared''::text, prepared_at timestamp with time zone NN D=now(), requested_at timestamp with time zone, idempotency_key text NN D=''''::text, needs_review boolean NN D=false, method text NN D=''''::text, approved_at timestamp with time zone, receipt_url text NN D=''''::text, error text NN D=''''::text, created_at timestamp with time zone NN D=now(), updated_at timestamp with time zone NN D=now()',
    (select s from cols where attrelid = (select t from pay))
  union all select 5, '시도 이력 칸 형식·NOT NULL·기본값 = 목록',
    'id uuid NN D=gen_random_uuid(), payment_id uuid NN, exchange_id uuid NN, store_id uuid NN, order_id uuid NN, toss_order_id text NN, payment_key text NN, idempotency_key text NN, amount bigint NN, status text NN, error text NN D=''''::text, method text NN D=''''::text, approved_at timestamp with time zone, receipt_url text NN D=''''::text, prepared_at timestamp with time zone, requested_at timestamp with time zone, reason text NN, archived_by uuid, archived_at timestamp with time zone NN D=now()',
    (select s from cols where attrelid = (select t from att))
  union all select 6, '결제 기록 제약(상태 6종·금액>0·토스 주문 번호 형식·유일·외래 키) = 목록',
    'mall_builder_exchange_fee_payments_amount_check:c:CHECK ((amount > 0)) ; mall_builder_exchange_fee_payments_exchange_id_fkey:f:FOREIGN KEY (exchange_id) REFERENCES mall_builder_exchanges(id) ON DELETE CASCADE ; mall_builder_exchange_fee_payments_exchange_id_key:u:UNIQUE (exchange_id) ; mall_builder_exchange_fee_payments_order_id_fkey:f:FOREIGN KEY (order_id) REFERENCES mall_builder_orders(id) ON DELETE CASCADE ; mall_builder_exchange_fee_payments_pkey:p:PRIMARY KEY (id) ; mall_builder_exchange_fee_payments_status_check:c:CHECK ((status = ANY (ARRAY[''prepared''::text, ''requested''::text, ''done''::text, ''failed''::text, ''unknown''::text, ''canceled''::text]))) ; mall_builder_exchange_fee_payments_store_id_fkey:f:FOREIGN KEY (store_id) REFERENCES mall_builder_stores(id) ON DELETE CASCADE ; mall_builder_exchange_fee_payments_toss_order_id_check:c:CHECK ((toss_order_id ~ ''^exfee-[0-9a-f-]{36}$''::text)) ; mall_builder_exchange_fee_payments_toss_order_id_key:u:UNIQUE (toss_order_id)',
    (select s from cons where conrelid = (select t from pay))
  union all select 7, '시도 이력 제약(사유 3종·외래 키) = 목록',
    'mall_builder_exchange_fee_payment_attempts_exchange_id_fkey:f:FOREIGN KEY (exchange_id) REFERENCES mall_builder_exchanges(id) ON DELETE CASCADE ; mall_builder_exchange_fee_payment_attempts_order_id_fkey:f:FOREIGN KEY (order_id) REFERENCES mall_builder_orders(id) ON DELETE CASCADE ; mall_builder_exchange_fee_payment_attempts_payment_id_fkey:f:FOREIGN KEY (payment_id) REFERENCES mall_builder_exchange_fee_payments(id) ON DELETE CASCADE ; mall_builder_exchange_fee_payment_attempts_pkey:p:PRIMARY KEY (id) ; mall_builder_exchange_fee_payment_attempts_reason_check:c:CHECK ((reason = ANY (ARRAY[''replaced_failed''::text, ''toss_canceled''::text, ''toss_partial_canceled''::text]))) ; mall_builder_exchange_fee_payment_attempts_store_id_fkey:f:FOREIGN KEY (store_id) REFERENCES mall_builder_stores(id) ON DELETE CASCADE',
    (select s from cons where conrelid = (select t from att))
  -- 정책 개수를 따로 세고(모든 명령·역할), 조건식·쓰기 조건이 비어도(NULL) 「-」로 남겨 줄이 사라지지 않게 한다(QA015 잔여 P2)
  union all select 8, '정책: 결제 기록 정확히 1개 = 읽기·허용형·로그인 회원·조건식 지문·쓰기 조건 없음 / 시도 이력 0개',
    '1 | mall_builder_exchange_fee_payments_read:r:permissive:authenticated:be5456c1963d9d605fc4e16d3f384b8e:- / 0',
    (select count(*) from pg_policy where polrelid = (select t from pay)) || ' | '
    || coalesce((select string_agg(polname || ':' || polcmd::text || ':' || case when polpermissive then 'permissive' else 'restrictive' end || ':'
         || coalesce(array_to_string(polroles::regrole[], ','), '-') || ':' || coalesce(md5(pg_get_expr(polqual, polrelid)), '-') || ':'
         || coalesce(md5(pg_get_expr(polwithcheck, polrelid)), '-'), ' ; ' order by polname) from pg_policy where polrelid = (select t from pay)), '(정책 없음)')
    || ' / ' || (select count(*) from pg_policy where polrelid = (select t from att))
  union all select 9, '결제 기록 로그인 회원이 읽을 수 있는 칸 = 화면 필수 칸 포함 16개(결제 키·멱등키 제외)',
    'id,exchange_id,store_id,order_id,toss_order_id,amount,status,prepared_at,requested_at,needs_review,method,approved_at,receipt_url,error,created_at,updated_at',
    (select string_agg(a.attname, ',' order by a.attnum) from pg_attribute a where a.attrelid = (select t from pay) and a.attnum > 0 and not a.attisdropped
       and has_column_privilege('authenticated', a.attrelid, a.attnum, 'select'))
  union all select 10, '결제 기록 그 밖 권한 0: 비로그인 읽기 칸 0·회원 쓰기(표·칸) 0·직접 부여는 회원 칸 SELECT만', '0/0/0',
    (select count(*) from pg_attribute a where a.attrelid = (select t from pay) and a.attnum > 0 and not a.attisdropped and has_column_privilege('anon', a.attrelid, a.attnum, 'select')) || '/'
    || (select count(*) from r, pg_attribute a where a.attrelid = (select t from pay) and a.attnum > 0 and not a.attisdropped
         and (has_column_privilege(r.n, a.attrelid, a.attnum, 'insert') or has_column_privilege(r.n, a.attrelid, a.attnum, 'update'))) + (select count(*) from r, unnest(array['insert', 'update', 'delete', 'truncate']) p(x) where has_table_privilege(r.n, (select t from pay), p.x)) || '/'
    || ((select count(*) from pg_class c, aclexplode(c.relacl) e where c.oid = (select t from pay) and e.grantee in (select g from roles))
        + (select count(*) from pg_attribute a, aclexplode(a.attacl) e where a.attrelid = (select t from pay) and e.grantee in (select g from roles)
             and not (e.grantee = 'authenticated'::regrole and e.privilege_type = 'SELECT')))
  union all select 11, '시도 이력 권한 0: 회원·비로그인 SELECT·INSERT·UPDATE·DELETE 효력 0 / 칸 효력 0 / PUBLIC·anon·authenticated 직접 부여 0', '0/0/0',
    (select count(*) from r, unnest(array['select', 'insert', 'update', 'delete', 'truncate', 'references']) p(x) where has_table_privilege(r.n, (select t from att), p.x)) || '/'
    || (select count(*) from r, pg_attribute a, unnest(array['select', 'insert', 'update', 'references']) p(x) where a.attrelid = (select t from att) and a.attnum > 0 and not a.attisdropped
         and has_column_privilege(r.n, a.attrelid, a.attnum, p.x)) || '/'
    || ((select count(*) from pg_class c, aclexplode(c.relacl) e where c.oid = (select t from att) and e.grantee in (select g from roles))
        + (select count(*) from pg_attribute a, aclexplode(a.attacl) e where a.attrelid = (select t from att) and e.grantee in (select g from roles)))
  union all select 12, '공개 함수 3개 서명·소유자 권한·search_path 빈 값 = 목록',
    'public.mall_builder_exchange_fee_card_confirm(p_exchange_id uuid, p_payment_key text):true:search_path="" ; public.mall_builder_exchange_fee_card_prepare(p_exchange_id uuid, p_payment_key text, p_amount bigint):true:search_path="" ; public.mall_builder_exchange_fee_card_recheck(p_exchange_id uuid):true:search_path=""',
    (select string_agg(nspname || '.' || proname || '(' || args || '):' || prosecdef || ':' || cfg, ' ; ' order by proname) from fns where nspname = 'public')
  union all select 13, '공개 함수 3개 실행: 회원 있음·비로그인 없음·PUBLIC 직접 부여 0', 'true,false|true,false|true,false / 0',
    (select string_agg(has_function_privilege('authenticated', oid, 'execute') || ',' || has_function_privilege('anon', oid, 'execute'), '|' order by proname) from fns where nspname = 'public')
    || ' / ' || (select count(*) from fns, aclexplode(fns.proacl) e where fns.nspname = 'public' and e.grantee in (0, 'anon'::regrole))
  union all select 14, '내부 함수 4개 서명·소유자 권한·search_path = 목록 / 회원·비로그인 실행 효력 0 / 직접 부여 0',
    'mall_builder_private.exchange_fee_attempt_archive(p_payment_id uuid, p_reason text):false:search_path="" ; mall_builder_private.exchange_fee_card_hold_canceled(p_payment_id uuid, p_toss_status text):false:search_path="" ; mall_builder_private.exchange_fee_mark_card_paid(p_exchange_id uuid, p_method text, p_role text):false:search_path="" ; mall_builder_private.exchanges_fee_card_guard():true:search_path="" / 0 / 0',
    (select string_agg(nspname || '.' || proname || '(' || args || '):' || prosecdef || ':' || cfg, ' ; ' order by proname) from fns where nspname = 'mall_builder_private')
    || ' / ' || (select count(*) from fns, r where fns.nspname = 'mall_builder_private' and has_function_privilege(r.n, fns.oid, 'execute'))
    || ' / ' || (select count(*) from fns, aclexplode(fns.proacl) e where fns.nspname = 'mall_builder_private' and e.grantee in (select g from roles))
  union all select 15, '교환 표 지킴 트리거 = 이름·켜짐(O)·BEFORE UPDATE·행마다·연결 함수, 그 표의 트리거는 이것 하나',
    'mall_builder_exchanges_fee_card_guard|O|CREATE TRIGGER mall_builder_exchanges_fee_card_guard BEFORE UPDATE ON public.mall_builder_exchanges FOR EACH ROW EXECUTE FUNCTION mall_builder_private.exchanges_fee_card_guard()',
    (select string_agg(tgname || '|' || tgenabled::text || '|' || pg_get_triggerdef(oid), ' ; ') from pg_trigger where tgrelid = 'public.mall_builder_exchanges'::regclass and not tgisinternal)
  union all select 16, '결제 기록 0줄·시도 이력 0줄(새 자료 0)', '0/0',
    (select count(*) from public.mall_builder_exchange_fee_payments) || '/' || (select count(*) from public.mall_builder_exchange_fee_payment_attempts)
  union all select 17, '교환 1행 그대로 = 시험 교환 rejected·교환비 없음', '1/rejected:none:0',
    (select count(*) || '/' || coalesce(string_agg(step || ':' || fee_status || ':' || fee, ','), '') from public.mall_builder_exchanges)
  union all select 18, '시험 아닌 주문 17/1·지문 그대로(precheck 17번) · 알림 44', '17/1/c56e3560d4f9b4d98c724cbfc93ed228/44',
    (select count(*) filter (where s.slug = 'aimaster-b2b') || '/' || count(*) filter (where s.slug = 'card-test-resale')
       from public.mall_builder_orders o join public.mall_builder_stores s on s.id = o.store_id where o.id::text not like 'e0102000%') || '/'
    || (select md5(string_agg(o.id || ':' || o.status || ':' || o.updated_at, ',' order by o.id)) from public.mall_builder_orders o where o.id::text not like 'e0102000%')
    || '/' || (select count(*) from public.mall_builder_notifications)
  union all select 19, '시험 주문 EXQA-1 delivered·EXQA-2 confirmed', 'delivered/confirmed',
    (select string_agg(status, '/' order by id) from public.mall_builder_orders where id in ('e0102000-0000-4000-8000-000000000031', 'e0102000-0000-4000-8000-000000000032'))
  union all select 20, '리셀러 장부 500 1줄 · 리워드 paid 500·pending 2300', '7203b416-e791-487c-8708-36e9503493e8:500 | paid:500,pending:2300',
    (select coalesce(string_agg(id || ':' || amount, ',' order by created_at), '없음') from public.mall_builder_reseller_ledger) || ' | '
    || (select coalesce(string_agg(status || ':' || amount, ',' order by amount), '없음') from public.mall_builder_reseller_rewards)
), j as (select o, 항목, 기대, coalesce(실제, '(없음)') 실제 from chk)
select o 순서, 항목, 기대, 실제, case when 기대 = 실제 then 'OK' else '확인 필요' end 판정 from j
union all select 21, '전체', '20/20', (select count(*) filter (where 기대 = 실제) from j)::text || '/' || (select count(*) from j)::text,
  case when (select count(*) from j) = 20 and (select count(*) filter (where 기대 = 실제) from j) = 20 then 'OK' else '확인 필요' end
union all select 22, '기록: 교환 행 지문(precheck 18번과 같아야)', '-',
  (select md5(coalesce(string_agg(id || ':' || step || ':' || fee_status || ':' || updated_at, ',' order by id), '')) from public.mall_builder_exchanges), '비교'
order by 1;
