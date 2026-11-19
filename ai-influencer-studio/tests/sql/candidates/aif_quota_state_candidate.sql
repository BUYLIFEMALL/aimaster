-- AIF 저장 한도 판정 구분 — **후보**(2026-11-19, CC-SNS-01, Master msg_db2b0fb8b3fd)
-- ★ 이 파일은 적용 대상이 아니다. 어느 DB에도 적용되지 않았다(격리 시험 DB에서만 실행). supabase/migrations/ 밖에 둔 것도 그 때문이다.
--   운영 적용은 별도 승인·별도 작업이며, 그때 이 내용을 새 마이그레이션 파일로 옮긴다.
-- 무엇을 바꾸나: 회원의 저장 한도를 「안다(finite) / 명시적 무제한(unlimited) / 모른다(unknown)」로 가른다.
--   지금은 한도 값이 비어 있으면 전부 「무제한」으로 읽는다 — 프로필 없음(정책 0행)·free 요금제 행을 읽지 못함도 무제한처럼 허용된다.
-- 바꾸는 것: 함수 1개 추가(aif_asset_quota_snapshot, 서비스 내부용) + 함수 3개 교체(create or replace — 이름·인자·반환 칸·권한 그대로).
--   aif_asset_usage_estimate: 지우지 않는다. 같은 반환 칸의 얇은 감싸개가 된다.
--   aif_asset_precheck / aif_asset_reserve: 공식 RPC 서명 그대로. 스냅샷의 판정을 쓴다.
-- 정책(중앙 member_storage_policy)은 스냅샷 함수 안에서 조회 문 하나로 한 번만 읽는다. 중앙 함수·기존 마이그레이션 파일은 고치지 않는다.
-- 적용 전 확인: 같은 이름의 함수가 이미 있는데 이 후보의 표식이 없으면 덮어쓰지 않고 멈춘다. 적용 끝에는 세 함수의 소유자가 새 함수를 실행할 수 있는지 확인하고, 아니면 전부 취소한다.
-- 원복: 같은 폴더의 aif_quota_state_rollback.sql(세 함수를 원문으로 되돌리고 새 함수를 지운다).
-- 원문 출처: supabase/migrations/20261118120000_aif_assets_a1.sql — 아래 본문은 그 파일의 해당 함수에서 필요한 줄만 바꾼 것이다(생성 뒤 손으로 고치지 않음).

begin;

-- 0. 적용 전 확인 — 같은 이름의 함수가 이미 있으면, 이 후보가 만든 것(표식이 붙은 것)일 때만 계속한다.
--    남의 함수(표식 없음·인자가 다른 같은 이름)를 덮어쓰지 않는다. 멈추면 이 트랜잭션 전체가 취소된다(아무것도 바뀌지 않는다).
do $$
declare v_other integer; v_missing integer;
begin
  select count(*) into v_other
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'aif_asset_quota_snapshot'
    and (pg_catalog.pg_get_function_identity_arguments(p.oid) <> 'p_user uuid'
         or pg_catalog.obj_description(p.oid, 'pg_proc') is distinct from 'AIF quota-state candidate v1 (aif_asset_quota_snapshot)');
  if v_other > 0 then
    raise exception 'AIF_QUOTA_CANDIDATE_CONFLICT: public.aif_asset_quota_snapshot already exists and is not this candidate''s function' using errcode = 'P0001';
  end if;
  -- 바꿀 세 함수가 기대한 서명으로 정확히 하나씩 있어야 한다(없거나 겹치면 다른 상태의 DB다)
  select 3 - count(*) into v_missing
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and (p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid)) in (
      ('aif_asset_usage_estimate', 'p_user uuid'),
      ('aif_asset_precheck', 'p_user uuid, p_est_bytes bigint'),
      ('aif_asset_reserve', 'p_user uuid, p_kind text, p_mime text, p_ext text, p_bytes bigint, p_sha256 text'));
  if v_missing <> 0 then
    raise exception 'AIF_QUOTA_CANDIDATE_PRECONDITION: expected functions are not present with the expected signatures' using errcode = 'P0001';
  end if;
end $$;

-- 1. 내부용 스냅샷(사용량 + 한도 + 판정). 서비스 역할만 실행 — API에서 직접 부르는 용도가 아니다.
create or replace function public.aif_asset_quota_snapshot(p_user uuid)
returns table (used_bytes bigint, quota_bytes bigint, measured_at timestamptz, quota_state text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_measured timestamptz; v_central bigint; v_ours bigint; v_quota bigint; v_n integer; v_source text; v_state text;
begin
  select u.bytes, u.measured_at into v_central, v_measured from public.member_storage_usage u where u.user_id = p_user;
  v_central := coalesce(v_central, 0);
  -- 정책은 여기서 한 번만 읽는다: 행 수·한도·출처를 같은 조회 문(같은 스냅샷)에서.
  select count(*), max(pol.quota_bytes), max(pol.source) into v_n, v_quota, v_source from public.member_storage_policy(p_user) pol;
  -- finite = 한도를 안다 / unlimited = 명시적 무제한(행 1개·한도 비어 있음·출처 exempt) / unknown = 그 밖 전부(0행·여러 행·한도가 비었는데 exempt가 아님)
  v_state := case when v_n <> 1 then 'unknown' when v_quota is not null then 'finite' when v_source = 'exempt' then 'unlimited' else 'unknown' end;
  if v_state <> 'finite' then v_quota := null; end if;
  -- R1-2·R2-1: reserved/unknown 전부 + 측정에 아직 안 들어갔을 수 있는 ready(측정 시각 - 10분 여유). 측정 기록이 없으면 ready 전부.
  -- §19-R1-F01: expired는 삭제 예약이 deleted로 확정된 것만 빼고 전부 더한다. 중앙 측정이 같은 객체를 이미 세면 이중 계산(보수)이며 허용한다.
  --   「오래됐으니 중앙에 이미 들어 있을 것」이라는 이유로 빼지 않는다(중앙 미측정·오래된 회차에서 과소 계산).
  select coalesce(sum(a.bytes), 0) into v_ours
  from public.aif_assets a
  where a.user_id = p_user
    and (a.state in ('reserved','unknown')
         or (a.state = 'ready' and (v_measured is null or a.stored_at > v_measured - interval '10 minutes'))
         or (a.state = 'expired' and not exists (
               select 1 from public.aif_asset_deletions d where d.asset_id = a.id and d.state = 'deleted')));
  return query select (v_central + v_ours)::bigint, v_quota, v_measured, v_state;
end $$;
revoke all on function public.aif_asset_quota_snapshot(uuid) from public, anon, authenticated;
grant execute on function public.aif_asset_quota_snapshot(uuid) to service_role;

-- 2. 기존 추정 함수: 같은 이름·인자·반환 칸의 감싸개
create or replace function public.aif_asset_usage_estimate(p_user uuid)
returns table (used_bytes bigint, quota_bytes bigint, measured_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query select s.used_bytes, s.quota_bytes, s.measured_at from public.aif_asset_quota_snapshot(p_user) s;
end $$;
revoke all on function public.aif_asset_usage_estimate(uuid) from public, anon, authenticated;
grant execute on function public.aif_asset_usage_estimate(uuid) to service_role;

-- 3. 사전 검사
create or replace function public.aif_asset_precheck(p_user uuid, p_est_bytes bigint)
returns table (allowed boolean, used_bytes bigint, quota_bytes bigint)
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if p_est_bytes is null or p_est_bytes <= 0 then raise exception 'INVALID' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtext('aif_user:' || p_user::text));
  select * into r from public.aif_asset_quota_snapshot(p_user);
  -- unknown이면 allowed를 비워 돌려준다(참도 거짓도 아님) → 호출부는 「확인 불가」로 읽어 생성을 시작하지 않는다
  return query select case r.quota_state when 'unlimited' then true when 'finite' then (r.used_bytes + p_est_bytes <= r.quota_bytes) else null end, r.used_bytes, r.quota_bytes;
end $$;
revoke all on function public.aif_asset_precheck(uuid, bigint) from public, anon, authenticated;
grant execute on function public.aif_asset_precheck(uuid, bigint) to service_role;

-- 4. 예약(참고 사진·생성 결과 공통)
create or replace function public.aif_asset_reserve(p_user uuid, p_kind text, p_mime text, p_ext text, p_bytes bigint, p_sha256 text)
returns table (asset_id uuid, path text)
language plpgsql security definer set search_path = '' as $$
declare r record; v_id uuid; v_path text;
begin
  if p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'INVALID' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtext('aif_user:' || p_user::text));
  select * into r from public.aif_asset_quota_snapshot(p_user);
  -- 한도를 모르면 예약하지 않는다(저장공간 부족과 다른 오류 글 — 호출부가 507이 아니라 503으로 답한다)
  if r.quota_state is null or r.quota_state not in ('finite', 'unlimited') then
    raise exception 'QUOTA_UNKNOWN' using errcode = 'P0001';
  end if;
  if r.quota_state = 'finite' and r.used_bytes + p_bytes > r.quota_bytes then
    raise exception 'STORAGE_LIMIT' using errcode = 'P0001';
  end if;
  v_id := gen_random_uuid();
  v_path := p_user::text || '/' || p_kind || '/' || v_id::text || '.' || p_ext;
  insert into public.aif_assets (id, user_id, kind, mime, ext, path, bytes, sha256, state)
  values (v_id, p_user, p_kind, p_mime, p_ext, v_path, p_bytes, p_sha256, 'reserved');   -- check 제약이 kind/mime/ext/크기 모양을 거른다
  return query select v_id, v_path;
end $$;
revoke all on function public.aif_asset_reserve(uuid, text, text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.aif_asset_reserve(uuid, text, text, text, bigint, text) to service_role;

-- 5. 표식 — 이 후보가 만든 함수임을 적어 둔다(다시 적용할 때와 원복할 때 이 글을 확인한다)
comment on function public.aif_asset_quota_snapshot(uuid) is 'AIF quota-state candidate v1 (aif_asset_quota_snapshot)';

-- 6. 적용 끝 확인 — 새 함수를 부르는 세 함수는 소유자 권한으로 돈다(security definer).
--    그 소유자 가운데 하나라도 새 함수를 실행할 수 없으면 적용하지 않는다(전부 취소). 회원 역할·공개 실행 권한이 붙어 있어도 취소한다.
do $$
declare v_bad integer;
begin
  select count(*) into v_bad
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in ('aif_asset_usage_estimate', 'aif_asset_precheck', 'aif_asset_reserve')
    and not (p.prosecdef and pg_catalog.has_function_privilege(p.proowner, 'public.aif_asset_quota_snapshot(uuid)'::regprocedure, 'execute'));
  if v_bad > 0 then
    raise exception 'AIF_QUOTA_CANDIDATE_OWNER: a calling function''s owner cannot execute public.aif_asset_quota_snapshot' using errcode = 'P0001';
  end if;
  if pg_catalog.has_function_privilege('anon', 'public.aif_asset_quota_snapshot(uuid)'::regprocedure, 'execute')
     or pg_catalog.has_function_privilege('authenticated', 'public.aif_asset_quota_snapshot(uuid)'::regprocedure, 'execute')
     or not pg_catalog.has_function_privilege('service_role', 'public.aif_asset_quota_snapshot(uuid)'::regprocedure, 'execute') then
    raise exception 'AIF_QUOTA_CANDIDATE_ACL: unexpected execute privileges on public.aif_asset_quota_snapshot' using errcode = 'P0001';
  end if;
end $$;

commit;
