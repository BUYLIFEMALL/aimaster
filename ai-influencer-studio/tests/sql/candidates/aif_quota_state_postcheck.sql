-- AIF 저장 한도 판정 구분 — 적용 전·적용 직후·원복 뒤에 쓰는 **읽기 전용** 확인 조회문(2026-11-20, CC-SNS-01)
-- select 하나뿐이다. 아무것도 바꾸지 않는다. 한 줄(jsonb)을 돌려준다.
-- 짝: aif_quota_state_candidate.sql(적용) · aif_quota_state_rollback.sql(원복). W00_BASELINE §14-BD ③·§14-BE ④의 점검 1·2·3·4·5·15·16·17에 대응한다.
-- 읽는 법
--   state        : 'candidate'(후보 적용됨) | 'original'(원문 상태) | 'mixed'(둘 다 아님 — 멈추고 보고)
--   candidate_ok : 후보 적용 뒤 기대한 모양 전부 일치(본문 지문 4개·표식·권한·소유자 실행 권한)
--   original_ok  : 원문 상태(스냅샷 함수 없음 + 세 함수 본문이 저장소 원문과 같음)
--   functions    : 함수별 실제 값(지문은 본문에서 CR을 뺀 md5 — 저장소 파일에서 계산한 값과 견준다)
-- 기대 지문의 출처: 후보 = aif_quota_state_candidate.sql, 원문 = supabase/migrations/20261118120000_aif_assets_a1.sql
--   (저장소 쪽 계산 도구는 함수 본문의 $$ 사이 글에서 CR을 뺀 md5. 후보·원문 파일이 바뀌면 아래 값도 같이 고친다.)
-- 보지 않는 것: 실제 호출 동작(알려진 사용량 회원의 used_bytes·한도 경계·열외 회원) — 서비스 역할 호출이 필요해 별도 범위다.

with want(proname, args, cand_md5, orig_md5) as (
  values
    ('aif_asset_quota_snapshot', 'p_user uuid', '6c3ca6a7d2a563c57f566bb98541a70a', null),
    ('aif_asset_usage_estimate', 'p_user uuid', 'ad7128ffce8378ad32e950cf09808233', 'dbad09c5cc2aba31fbc34d30f9a28bba'),
    ('aif_asset_precheck', 'p_user uuid, p_est_bytes bigint', '5b30ef9ae925a2b1ed9e875c2fa74384', '99ba79310fd9a13615b6de2970d93242'),
    ('aif_asset_reserve', 'p_user uuid, p_kind text, p_mime text, p_ext text, p_bytes bigint, p_sha256 text', '9755cf74aa50398a3981aeed66fcd63b', '22000b6118c94c6a81d3408eff1694fd')
),
found as (
  select w.proname, w.args, w.cand_md5, w.orig_md5,
         p.oid, p.prosecdef, p.provolatile, p.proconfig,
         pg_catalog.pg_get_userbyid(p.proowner) as owner,
         pg_catalog.md5(pg_catalog.replace(p.prosrc, E'\r', '')) as body_md5,
         pg_catalog.obj_description(p.oid, 'pg_proc') as note,
         pg_catalog.has_function_privilege('anon', p.oid, 'execute') as x_anon,
         pg_catalog.has_function_privilege('authenticated', p.oid, 'execute') as x_auth,
         pg_catalog.has_function_privilege('service_role', p.oid, 'execute') as x_service,
         pg_catalog.has_function_privilege(p.proowner, p.oid, 'execute') as x_owner,
         (select count(*) from pg_catalog.pg_proc q join pg_catalog.pg_namespace m on m.oid = q.pronamespace
            where m.nspname = 'public' and q.proname = w.proname) as same_name_count
  from want w
  left join pg_catalog.pg_proc p
    on p.proname = w.proname
   and p.pronamespace = 'public'::regnamespace
   and pg_catalog.pg_get_function_identity_arguments(p.oid) = w.args
),
verdict as (
  select
    -- 후보 상태: 네 함수 모두 하나씩 있고 본문이 후보와 같다 + 표식 + 권한
    bool_and(oid is not null and same_name_count = 1 and body_md5 = cand_md5
             and prosecdef and not x_anon and not x_auth and x_service) as cand_shape,
    bool_and(case when proname = 'aif_asset_quota_snapshot'
                  then note is not distinct from 'AIF quota-state candidate v1 (aif_asset_quota_snapshot)' else true end) as cand_mark,
    -- 원문 상태: 스냅샷 함수 없음 + 세 함수 본문이 원문과 같다 + 권한
    bool_and(case when proname = 'aif_asset_quota_snapshot' then oid is null and same_name_count = 0
                  else oid is not null and same_name_count = 1 and body_md5 = orig_md5
                       and prosecdef and not x_anon and not x_auth and x_service end) as orig_shape,
    count(distinct owner) filter (where oid is not null) as owner_count
  from found
)
select jsonb_build_object(
  'checked_at', now(),
  'state', case when v.cand_shape and v.cand_mark then 'candidate' when v.orig_shape then 'original' else 'mixed' end,
  'candidate_ok', (v.cand_shape and v.cand_mark and v.owner_count = 1
                   -- 부르는 세 함수의 소유자가 스냅샷 함수를 실행할 수 있어야 한다
                   and not exists (select 1 from found f where f.proname <> 'aif_asset_quota_snapshot'
                                     and not pg_catalog.has_function_privilege(
                                           (select p.proowner from pg_catalog.pg_proc p where p.oid = f.oid),
                                           (select s.oid from found s where s.proname = 'aif_asset_quota_snapshot'), 'execute'))),
  'original_ok', v.orig_shape,
  'owner_count', v.owner_count,
  -- 스냅샷 함수를 본문에서 부르는 public 함수(후보 뒤 기대: estimate·precheck·reserve 셋)
  'snapshot_callers', (select coalesce(jsonb_agg(q.proname order by q.proname), '[]'::jsonb)
                       from pg_catalog.pg_proc q where q.pronamespace = 'public'::regnamespace
                         and q.proname <> 'aif_asset_quota_snapshot' and q.prosrc like '%aif_asset_quota_snapshot%'),
  'functions', (select jsonb_agg(jsonb_build_object(
                  'name', f.proname, 'present', f.oid is not null, 'oid', f.oid, 'same_name_count', f.same_name_count,
                  'owner', f.owner, 'security_definer', f.prosecdef, 'volatility', f.provolatile, 'config', f.proconfig,
                  'body_md5', f.body_md5,
                  'matches', case when f.body_md5 = f.cand_md5 then 'candidate' when f.body_md5 = f.orig_md5 then 'original'
                                  when f.oid is null then 'absent' else 'other' end,
                  'mark', f.note, 'exec_anon', f.x_anon, 'exec_authenticated', f.x_auth, 'exec_service_role', f.x_service,
                  'exec_owner', f.x_owner) order by f.proname) from found f)
) as aif_quota_state_check
from verdict v;
