-- AIF 저장 한도 판정 구분 후보의 **원복**(2026-11-19, CC-SNS-01)
-- ★ 후보와 마찬가지로 어느 DB에도 적용되지 않았다(격리 시험 DB에서만 실행).
-- 순서: 사전 검사·예약·추정 함수를 원문으로 되돌린 뒤(스냅샷을 부르는 곳이 없어진 뒤) 스냅샷 함수를 지운다. cascade를 쓰지 않는다.
-- 지우는 것은 이 후보가 만든 표식(함수 설명 글)이 붙은 스냅샷 함수 하나뿐이다. 표식이 없거나 함수가 없으면 아무것도 바꾸지 않고 멈춘다.
-- 아래 세 함수는 supabase/migrations/20261118120000_aif_assets_a1.sql의 정의를 글자 그대로 옮긴 것이다.

begin;

-- 0. 원복 전 확인 — 「이 후보를 적용한 바로 그 상태」일 때만 진행한다. 멈추면 이 트랜잭션 전체가 취소된다(네 함수 모두 그대로 둔다).
--    가) 지울 함수가 정확히 하나 있고, 기대한 인자이고, 이 후보의 표식이 붙어 있고, **본문이 이 후보의 것**이다.
--        (표식은 권한 있는 사람이 복사할 수 있다 — 같은 표식이 붙은 다른 본문은 이 후보의 것으로 보지 않는다.)
--    나) 되돌릴 세 함수가 이름마다 정확히 하나씩, 기대한 인자·반환 칸으로 있고, **본문이 이 후보의 것**이다.
--        적용 뒤에 다른 작업이 그 함수를 바꿨거나 지웠으면 덮어쓰지도 다시 만들지도 않고 멈춘다.
--    본문 지문 = 함수 본문에서 줄 끝 문자(CR)를 뺀 글자의 md5. 이 파일과 짝인 적용 파일의 본문에서 계산해 적어 넣은 값이다.
do $$
declare v_bad integer;
begin
  select count(*) into v_bad
  from (values
    ('aif_asset_quota_snapshot', 'p_user uuid', 'TABLE(used_bytes bigint, quota_bytes bigint, measured_at timestamp with time zone, quota_state text)', '6c3ca6a7d2a563c57f566bb98541a70a', true),
    ('aif_asset_usage_estimate', 'p_user uuid', 'TABLE(used_bytes bigint, quota_bytes bigint, measured_at timestamp with time zone)', 'ad7128ffce8378ad32e950cf09808233', false),
    ('aif_asset_precheck', 'p_user uuid, p_est_bytes bigint', 'TABLE(allowed boolean, used_bytes bigint, quota_bytes bigint)', '5b30ef9ae925a2b1ed9e875c2fa74384', false),
    ('aif_asset_reserve', 'p_user uuid, p_kind text, p_mime text, p_ext text, p_bytes bigint, p_sha256 text', 'TABLE(asset_id uuid, path text)', '9755cf74aa50398a3981aeed66fcd63b', false)
  ) as want(fn, args, result, h_cand, need_mark)
  where (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = want.fn) <> 1
     or not exists (
         select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = want.fn and p.prokind = 'f'
           and pg_catalog.pg_get_function_identity_arguments(p.oid) = want.args
           and pg_catalog.pg_get_function_result(p.oid) = want.result
           and pg_catalog.md5(pg_catalog.replace(p.prosrc, E'\r', '')) = want.h_cand
           and (not want.need_mark or pg_catalog.obj_description(p.oid, 'pg_proc') = 'AIF quota-state candidate v1 (aif_asset_quota_snapshot)'));
  if v_bad <> 0 then
    raise exception 'AIF_QUOTA_ROLLBACK_REFUSED: the four functions are not exactly in this candidate''s applied state (missing, changed, or not this candidate''s) — nothing changed' using errcode = 'P0001';
  end if;
end $$;

create or replace function public.aif_asset_precheck(p_user uuid, p_est_bytes bigint)
returns table (allowed boolean, used_bytes bigint, quota_bytes bigint)
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if p_est_bytes is null or p_est_bytes <= 0 then raise exception 'INVALID' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtext('aif_user:' || p_user::text));
  select * into r from public.aif_asset_usage_estimate(p_user);
  return query select (r.quota_bytes is null or r.used_bytes + p_est_bytes <= r.quota_bytes), r.used_bytes, r.quota_bytes;
end $$;
revoke all on function public.aif_asset_precheck(uuid, bigint) from public, anon, authenticated;
grant execute on function public.aif_asset_precheck(uuid, bigint) to service_role;

create or replace function public.aif_asset_reserve(p_user uuid, p_kind text, p_mime text, p_ext text, p_bytes bigint, p_sha256 text)
returns table (asset_id uuid, path text)
language plpgsql security definer set search_path = '' as $$
declare r record; v_id uuid; v_path text;
begin
  if p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'INVALID' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtext('aif_user:' || p_user::text));
  select * into r from public.aif_asset_usage_estimate(p_user);
  if r.quota_bytes is not null and r.used_bytes + p_bytes > r.quota_bytes then
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

create or replace function public.aif_asset_usage_estimate(p_user uuid)
returns table (used_bytes bigint, quota_bytes bigint, measured_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_measured timestamptz; v_central bigint; v_ours bigint; v_quota bigint;
begin
  select u.bytes, u.measured_at into v_central, v_measured from public.member_storage_usage u where u.user_id = p_user;
  v_central := coalesce(v_central, 0);
  select pol.quota_bytes into v_quota from public.member_storage_policy(p_user) pol;
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
  return query select (v_central + v_ours)::bigint, v_quota, v_measured;
end $$;
revoke all on function public.aif_asset_usage_estimate(uuid) from public, anon, authenticated;
grant execute on function public.aif_asset_usage_estimate(uuid) to service_role;

drop function public.aif_asset_quota_snapshot(uuid);

commit;
