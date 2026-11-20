-- R1 예약 실행 방식(두 칸 + 사이트 예약 허용 저장소) — 적용 전·적용 직후·원복 뒤에 쓰는 **읽기 전용** 확인 조회문(2026-11-20, CC-SNS-01)
-- select 하나뿐이다. 아무것도 바꾸지 않는다. 한 줄(jsonb)을 돌려준다.
-- 짝: aif_r1_scheduler_candidate.sql(적용) · aif_r1_scheduler_rollback.sql(원복). 후보의 「6. 적용 끝 확인」과 같은 것을 밖에서 다시 보고, 그 확인이 보지 않는 것
--   (함수 7개의 존재·소유자 권한 실행·검색 경로, 색인 2개, 제약, 행 수)을 더한다.
-- 읽는 법
--   state      : 'applied'(후보 적용됨) | 'not_applied'(새 칸·표·함수가 하나도 없음) | 'partial'(일부만 있음 — 멈추고 보고)
--   applied_ok : 적용 뒤 기대한 모양 전부 일치
--   그 밖의 칸 : 실제 값(대조·기록용). 행 내용·메모·회원 번호는 읽지 않는다 — 개수만 센다.
-- 보지 않는 것: 함수의 실제 동작(관리자 세션 지정·철회, 서비스 역할 조회) — 격리 시험 범위이고 운영에서는 별도 승인이 필요하다.

with fn_want(sig, w_anon, w_auth, w_service) as (
  values
    ('aif_platform_scheduler_is_allowed(p_user uuid)', false, false, true),
    ('aif_platform_scheduler_allowed_users()', false, false, true),
    ('aif_platform_scheduler_admin_actor()', false, false, false),
    ('aif_platform_scheduler_admin_set(p_user uuid, p_allow boolean, p_note text)', false, true, false),
    ('aif_platform_scheduler_admin_list()', false, true, false),
    ('aif_platform_scheduler_admin_history(p_user uuid)', false, true, false),
    ('aif_platform_scheduler_purge_history()', false, false, true)
),
fn as (
  select w.sig, w.w_anon, w.w_auth, w.w_service, p.oid, p.prosecdef, p.proconfig,
         pg_catalog.pg_get_userbyid(p.proowner) as owner,
         pg_catalog.has_function_privilege('anon', p.oid, 'execute') as x_anon,
         pg_catalog.has_function_privilege('authenticated', p.oid, 'execute') as x_auth,
         pg_catalog.has_function_privilege('service_role', p.oid, 'execute') as x_service
  from fn_want w
  left join pg_catalog.pg_proc p
    on p.pronamespace = 'public'::regnamespace
   and p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')' = w.sig
),
cols as (
  select count(*) filter (where column_name = 'platform_chosen_at' and data_type = 'timestamp with time zone' and is_nullable = 'YES') as chosen_ok,
         count(*) filter (where column_name = 'mode_rev' and data_type = 'integer' and is_nullable = 'NO') as rev_ok,
         count(*) filter (where column_name in ('platform_chosen_at', 'mode_rev')) as new_cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'aif_member_scheduler'
),
tabs as (
  select t.name, c.oid, c.relrowsecurity as rls, pg_catalog.pg_get_userbyid(c.relowner) as owner,
         (select count(*) from pg_catalog.pg_policies pol where pol.schemaname = 'public' and pol.tablename = t.name) as policies,
         -- API 역할 세 개 × 읽기·넣기·고치기·지우기 가운데 열려 있는 것의 수(기대 0)
         (select count(*) from unnest(array['anon', 'authenticated', 'service_role']) r, unnest(array['select', 'insert', 'update', 'delete']) pr
            where c.oid is not null and pg_catalog.has_table_privilege(r, c.oid, pr)) as open_privs
  from (values ('aif_platform_scheduler_allowlist'), ('aif_platform_scheduler_allowlist_events')) t(name)
  left join pg_catalog.pg_class c on c.relnamespace = 'public'::regnamespace and c.relname = t.name and c.relkind = 'r'
),
facts as (
  select
    (select new_cols from cols) as new_cols,
    (select chosen_ok = 1 and rev_ok = 1 from cols) as cols_ok,
    (select count(*) from tabs where oid is not null) as tables_present,
    (select coalesce(bool_and(oid is not null and rls and policies = 0 and open_privs = 0), false) from tabs) as tables_ok,
    (select count(*) from fn where oid is not null) as fns_present,
    (select coalesce(bool_and(oid is not null and prosecdef
                              and proconfig @> array['search_path=pg_catalog, pg_temp']
                              and x_anon = w_anon and x_auth = w_auth and x_service = w_service), false) from fn) as fns_ok,
    -- 같은 머리글의 함수가 기대한 7개 말고 더 있으면 안 된다
    (select count(*) from pg_catalog.pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'aif\_platform\_scheduler\_%') as fns_named,
    (select count(*) from pg_catalog.pg_indexes i where i.schemaname = 'public'
        and i.indexname in ('aif_platform_scheduler_allowlist_events_user_idx', 'aif_platform_scheduler_allowlist_events_at_idx')) as idx_present,
    (select count(*) from pg_catalog.pg_constraint k where k.conrelid = to_regclass('public.aif_platform_scheduler_allowlist')
        and k.conname in ('aif_platform_scheduler_allowlist_revoke_pair', 'aif_platform_scheduler_allowlist_note_len')) as named_checks,
    (select count(*) from pg_catalog.pg_constraint k where k.conrelid = to_regclass('public.aif_platform_scheduler_allowlist_events') and k.contype = 'c') as event_checks,
    (select count(*) from pg_catalog.pg_constraint k where k.conrelid = to_regclass('public.aif_platform_scheduler_allowlist')
        and k.contype = 'f' and k.confrelid = 'auth.users'::regclass and k.confdeltype = 'c') as cascade_fk
)
select jsonb_build_object(
  'checked_at', now(),
  'state', case when f.new_cols = 2 and f.tables_present = 2 and f.fns_present = 7 then 'applied'
                when f.new_cols = 0 and f.tables_present = 0 and f.fns_named = 0 then 'not_applied'
                else 'partial' end,
  'applied_ok', (f.cols_ok and f.tables_ok and f.fns_ok and f.fns_named = 7 and f.idx_present = 2
                 and f.named_checks = 2 and f.event_checks = 2 and f.cascade_fk = 1),
  'columns', jsonb_build_object('new_columns', f.new_cols, 'shape_ok', f.cols_ok),
  'tables', (select jsonb_agg(jsonb_build_object('name', t.name, 'present', t.oid is not null, 'owner', t.owner, 'rls', t.rls,
                                                 'policies', t.policies, 'open_api_privileges', t.open_privs) order by t.name) from tabs t),
  'functions', (select jsonb_agg(jsonb_build_object('signature', x.sig, 'present', x.oid is not null, 'owner', x.owner,
                                                    'security_definer', x.prosecdef, 'config', x.proconfig,
                                                    'exec_anon', x.x_anon, 'exec_authenticated', x.x_auth, 'exec_service_role', x.x_service,
                                                    'acl_ok', x.oid is not null and x.x_anon = x.w_anon and x.x_auth = x.w_auth and x.x_service = x.w_service)
                                 order by x.sig) from fn x),
  'functions_named_like_prefix', f.fns_named,
  'indexes_present', f.idx_present,
  'allowlist_named_checks', f.named_checks,
  'events_checks', f.event_checks,
  'allowlist_cascade_fk', f.cascade_fk,
  -- 기존 표의 행 수(적용 전후로 같아야 한다). 새 칸·새 표의 개수는 적용 뒤에만 셀 수 있어 여기서 세지 않는다 — 후보의 「적용 끝 확인」이 본다.
  'scheduler_rows', (select count(*) from public.aif_member_scheduler)
) as aif_r1_scheduler_check
from facts f;
