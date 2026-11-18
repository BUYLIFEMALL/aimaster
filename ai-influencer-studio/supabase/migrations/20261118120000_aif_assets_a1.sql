-- AI Influencer W01-A1 — 비공개 원본 자산(서버 보유 생성 원본 shadow 저장) 표·함수 초안.
-- ★ 초안이다. 운영 DB·시험 DB에 실행하지 않았다(2026-11-18). 실행은 격리 DB 계약 시험 승인 뒤, 운영 적용은 별도 승인.
-- 계약: docs/analysis-ai-influencer-20261118/W00_BASELINE.md §18·§18-R1·§18-R2(최종 037bfcacc), Master msg_063c9804ec87.
-- 작성: Claude(SNS) CC-SNS-01, 세션 claude-win-20261118-sns.
--
-- 원칙 요약
--  * 회원은 어떤 쓰기도 직접 하지 못한다. 모든 함수는 security definer + service_role만 execute. API 라우트가 로그인·이용권을 확인한 뒤 서비스 키로 부른다.
--  * 자산 id는 서버(이 함수)가 만든다. 경로는 {user_id}/{kind}/{id}.{ext} 한 가지. 회원 id가 맨 앞에 있어야 중앙 측정(name like '%uid%')에 잡힌다.
--  * 같은 앱 용량 계산(R1-2·R2-1): 중앙 측정값 + 우리 미측정분(reserved·unknown 전부 + stored_at > measured_at - 10분인 ready). 회원 잠금 안에서.
--  * unknown은 시간·횟수·객체 없음 조회로 failed가 되지 않는다(R2-2). 해제는 원격 요청 전 로컬 검증 실패만 — 그것은 함수 밖(API store)에서 reserve를 부르지 않는 것으로 처리되므로,
--    이 SQL에는 "원격 요청 전 실패" 전용 함수 aif_asset_abort_local 하나만 둔다(객체가 생길 가능성이 전혀 없음을 호출부가 보장할 때만).
--  * finalize는 storage.objects의 id·bucket·name·size 일치를 확인한다. metadata는 내용 증거가 아니며, 내용 검증(서명·상한·SHA)은 업로드 전 API store가 한다(R1-1 3번).
--  * 중앙 quota/retention 함수·표는 고치지 않는다. 버킷 생성·tracked bucket 등록·markPosted 호출은 이 파일에 없다(버킷은 별도 승인 후 생성, R1·18-6).
--  * 잠금 순서: 회원(aif_user:<uid>) → 자산(aif_asset:<id>). 두 잠금을 반대로 잡는 함수는 없다.
--
-- 2차 수정(2026-11-18, Mac 검수 msg_6ffe514132b3·msg_666b5f7d4d1e, Master msg_6e34a04e985b·msg_865712ee44b0) — 같은 초안 안에서만:
--  1) reconcile: 기대 객체 id(finalize가 기록한 object_id 또는 전달값)가 있고 그 id의 bucket·name·size가 모두 일치할 때만 ready. 기대 id 없으면 path+size 우회 금지.
--  2) claim_delete: canonical 경로·경로 안 id = p_asset·기존 자산 행 owner/bucket/path/id 전부 일치·conflict 행 owner/bucket/path 불변 대조 뒤 토큰 재발급.
--  3) delete_mark: 회원 확인 → 회원 잠금 → 자산 잠금 → 행/토큰/상태 재확인, 전이 행렬 고정(deleted·cancelled에서 되살림 없음), p_user 인자 추가.
--  4) record 변수(v_*)와 SQL 별칭(t/so/d) 분리, metadata size는 aif_asset_meta_size()로 안전 변환(null·문자·범위 밖 → 불일치, 원문 예외 0).
--  범위 정정(Master): 1~3의 소유 경계 결함은 service_role 전용 내부 함수의 계약 결함이지 회원 직접 RPC 공격 경로나 실제 DB 피해가 아니다
--  (회원은 함수 execute 권한이 없음). 4의 cast 예외는 함수 예외 → 거래 롤백으로 예약 행이 보존되므로 용량 해제 피해로 단정하지 않는다.
--  함수는 9개(계약 6 + 보조 usage_estimate·abort_local·meta_size). 보조 함수는 새 기능이 아니라 계약 구현을 돕는 내부용이다.
--  미확인: 기존 정책/기본 GRANT 재적용 안전성(create or replace 시 기존 grant 유지 여부)은 격리 DB 실행 때 확인한다.

-- ───────────────────────── 1. 표 aif_assets ─────────────────────────
create table if not exists public.aif_assets (
  id              uuid primary key,                                   -- 기본값 없음: aif_asset_reserve가 gen_random_uuid()로 만든다
  user_id         uuid not null references public.profiles(id) on delete cascade,
  kind            text not null check (kind in ('ref_face','ref_place','ref_product','generated')),
  bucket          text not null default 'aif-assets' check (bucket = 'aif-assets'),
  ext             text not null check (ext in ('png','jpg','webp','heic')),
  mime            text not null check (mime in ('image/png','image/jpeg','image/webp','image/heic','image/heif')),
  path            text not null,
  bytes           bigint not null check (bytes > 0),
  sha256          text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  state           text not null default 'reserved' check (state in ('reserved','ready','failed','unknown','missing')),
  object_id       uuid,                                               -- storage.objects.id (finalize 때 기록, 객체 동일성)
  stored_at       timestamptz,                                        -- ready 전환 시각(clock_timestamp)
  unknown_since   timestamptz,                                        -- 표시·사람 복구용. 시간 판정에 쓰지 않음(R2-2)
  missing_reason  text check (missing_reason is null or missing_reason in ('object_absent')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint aif_assets_path_shape check (path = user_id::text || '/' || kind || '/' || id::text || '.' || ext),
  constraint aif_assets_bucket_path_unique unique (bucket, path),
  constraint aif_assets_bytes_by_kind check (
    (kind like 'ref\_%' and bytes <= 1048576) or (kind = 'generated' and bytes <= 20971520)
  ),
  constraint aif_assets_mime_ext check (
    (mime = 'image/png'  and ext = 'png') or
    (mime = 'image/jpeg' and ext = 'jpg') or
    (mime = 'image/webp' and ext = 'webp') or
    (mime in ('image/heic','image/heif') and ext = 'heic')
  ),
  constraint aif_assets_ready_shape check (state <> 'ready' or (object_id is not null and stored_at is not null)),
  constraint aif_assets_missing_shape check (state <> 'missing' or missing_reason is not null)
);
create index if not exists aif_assets_user_created_idx on public.aif_assets (user_id, created_at desc);
create index if not exists aif_assets_state_created_idx on public.aif_assets (state, created_at);
create index if not exists aif_assets_user_state_stored_idx on public.aif_assets (user_id, state, stored_at);

alter table public.aif_assets enable row level security;
drop policy if exists aif_assets_select_own_ready on public.aif_assets;
create policy aif_assets_select_own_ready on public.aif_assets
  for select to authenticated using (auth.uid() = user_id and state = 'ready');
-- insert/update/delete 정책 없음 → 회원 쓰기 불가. 서비스 키는 RLS를 우회한다.
revoke all on table public.aif_assets from anon;
grant select on table public.aif_assets to authenticated;   -- RLS가 본인 ready만 보이게 한다

-- ───────────────────────── 2. 표 aif_asset_deletions ─────────────────────────
-- 삭제 예약(W00 §16). 이 단위에서는 외부 삭제를 실행하지 않는다 — claim/mark 함수만 계약대로 두고 호출부는 다음 단위.
create table if not exists public.aif_asset_deletions (
  asset_id        uuid primary key,                                   -- FK 없음(행 없는 고아 객체도 경로의 id로 예약)
  user_id         uuid not null,
  bucket          text not null check (bucket = 'aif-assets'),
  path            text not null,
  state           text not null check (state in ('claimed','deleting','deleted','delete_failed','delete_unknown','cancelled')),
  fencing_token   uuid not null,
  attempts        integer not null default 0 check (attempts >= 0),
  claimed_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint aif_asset_deletions_bucket_path_unique unique (bucket, path),
  constraint aif_asset_deletions_path_owner check (path like user_id::text || '/%')
);
create index if not exists aif_asset_deletions_state_updated_idx on public.aif_asset_deletions (state, updated_at);
alter table public.aif_asset_deletions enable row level security;   -- 정책 없음: 서비스 전용
revoke all on table public.aif_asset_deletions from anon, authenticated;

-- ───────────────────────── 3. 내부 도우미(서비스 전용) ─────────────────────────
-- storage.objects.metadata->>'size'를 안전하게 bigint로. null·빈 문자열·숫자 아님·범위 밖(0 이하·20MiB 초과)이면 null → 호출부는 '불일치'로 본다(원문 예외 0).
create or replace function public.aif_asset_meta_size(p_meta jsonb)
returns bigint
language plpgsql immutable set search_path = '' as $$
declare s text; v bigint;
begin
  s := p_meta->>'size';
  if s is null or s !~ '^[0-9]{1,10}$' then return null; end if;
  v := s::bigint;
  if v <= 0 or v > 20971520 then return null; end if;
  return v;
end $$;
revoke all on function public.aif_asset_meta_size(jsonb) from public, anon, authenticated;
grant execute on function public.aif_asset_meta_size(jsonb) to service_role;

-- 회원 잠금 안에서 부른다. 중앙 측정값 + 우리 미측정분. quota는 매번 다시 읽는다(null = 무제한).
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
  select coalesce(sum(a.bytes), 0) into v_ours
  from public.aif_assets a
  where a.user_id = p_user
    and (a.state in ('reserved','unknown')
         or (a.state = 'ready' and (v_measured is null or a.stored_at > v_measured - interval '10 minutes')));
  return query select (v_central + v_ours)::bigint, v_quota, v_measured;
end $$;
revoke all on function public.aif_asset_usage_estimate(uuid) from public, anon, authenticated;
grant execute on function public.aif_asset_usage_estimate(uuid) to service_role;

-- ───────────────────────── 4. 사전 검사(유료 생성 전) ─────────────────────────
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

-- ───────────────────────── 5. 예약(실제 바이트로) ─────────────────────────
-- 호출 전 API store가 바이트 서명·상한·SHA를 검증했어야 한다(R1-1 3번). 여기서는 형식·크기 제약과 용량만 본다.
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

-- ───────────────────────── 6. 확정(객체 동일성) ─────────────────────────
-- 업로드 응답의 객체 id를 받아 storage.objects와 대조한다. id가 없으면(응답 유실) ready로 단정하지 않고 unknown.
create or replace function public.aif_asset_finalize(p_asset uuid, p_user uuid, p_object_id uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare v_asset record; v_obj record;
begin
  perform pg_advisory_xact_lock(hashtext('aif_user:' || p_user::text));
  perform pg_advisory_xact_lock(hashtext('aif_asset:' || p_asset::text));
  select * into v_asset from public.aif_assets t where t.id = p_asset and t.user_id = p_user for update;
  if not found then return 'NOT_FOUND'; end if;
  if v_asset.state = 'ready' then return 'ready'; end if;
  if v_asset.state not in ('reserved','unknown') then return 'INVALID_STATE'; end if;
  if exists (select 1 from public.aif_asset_deletions d where d.asset_id = p_asset and d.state in ('claimed','deleting','delete_unknown')) then
    return 'ASSET_DELETION_IN_PROGRESS';
  end if;
  if p_object_id is null then
    -- 업로드 응답에서 객체 id를 얻지 못함 → ready 단정 0. 기대 id도 기록하지 않는다(모르는 값).
    update public.aif_assets set state = 'unknown', unknown_since = coalesce(unknown_since, clock_timestamp()), updated_at = now() where id = p_asset;
    return 'unknown';
  end if;
  -- 기대 객체 id를 먼저 기록해 둔다(reconcile이 같은 id로만 ready를 판정하도록, 수정 1).
  update public.aif_assets set object_id = coalesce(object_id, p_object_id), updated_at = now() where id = p_asset;
  if v_asset.object_id is not null and v_asset.object_id <> p_object_id then
    -- 이미 다른 기대 id가 있다 → 두 쓰기가 섞였을 가능성. unknown 유지.
    update public.aif_assets set state = 'unknown', unknown_since = coalesce(unknown_since, clock_timestamp()), updated_at = now() where id = p_asset;
    return 'unknown';
  end if;
  select so.id, so.bucket_id, so.name, public.aif_asset_meta_size(so.metadata) as size_bytes into v_obj
  from storage.objects so where so.id = p_object_id;
  if not found or v_obj.bucket_id <> v_asset.bucket or v_obj.name <> v_asset.path or v_obj.size_bytes is null or v_obj.size_bytes <> v_asset.bytes then
    -- 객체가 우리 예약과 다르거나 크기를 확인할 수 없다. failed로 단정하지 않고 unknown 유지(R2-2).
    update public.aif_assets set state = 'unknown', unknown_since = coalesce(unknown_since, clock_timestamp()), updated_at = now() where id = p_asset;
    return 'unknown';
  end if;
  update public.aif_assets set state = 'ready', object_id = p_object_id, stored_at = clock_timestamp(), unknown_since = null, updated_at = now() where id = p_asset;
  return 'ready';
end $$;
revoke all on function public.aif_asset_finalize(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.aif_asset_finalize(uuid, uuid, uuid) to service_role;

-- ───────────────────────── 7. 대조(reconcile) ─────────────────────────
-- 수정 1(Master msg_6e34a04e985b): 기대 객체 id가 있어야만 ready를 판정한다. finalize가 기록한 object_id 또는 호출부가 전달한 p_expected_object_id가
-- 있고, 그 id의 객체가 bucket·name·size까지 모두 일치할 때만 ready. 기대 id가 없으면 path+size로 우회하지 않고 unknown 유지.
-- 객체 없음·불일치·조회 불명은 모두 failed로 바꾸지 않는다(R2-2).
create or replace function public.aif_asset_reconcile(p_asset uuid, p_user uuid, p_expected_object_id uuid default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare v_asset record; v_obj record; v_expected uuid;
begin
  perform pg_advisory_xact_lock(hashtext('aif_user:' || p_user::text));
  perform pg_advisory_xact_lock(hashtext('aif_asset:' || p_asset::text));
  select * into v_asset from public.aif_assets t where t.id = p_asset and t.user_id = p_user for update;
  if not found then return 'NOT_FOUND'; end if;
  if v_asset.state not in ('reserved','unknown') then return v_asset.state; end if;
  if exists (select 1 from public.aif_asset_deletions d where d.asset_id = p_asset and d.state in ('claimed','deleting','delete_unknown')) then
    return 'ASSET_DELETION_IN_PROGRESS';
  end if;
  if v_asset.object_id is not null and p_expected_object_id is not null and v_asset.object_id <> p_expected_object_id then
    return 'unknown';   -- 기록된 기대 id와 전달된 기대 id가 다르다 → 판정 불가
  end if;
  v_expected := coalesce(v_asset.object_id, p_expected_object_id);
  if v_expected is null then
    if v_asset.state = 'reserved' then
      update public.aif_assets set state = 'unknown', unknown_since = clock_timestamp(), updated_at = now() where id = p_asset;
    end if;
    return 'unknown';   -- 기대 id 없음 → path+size 우회 금지
  end if;
  select so.id, so.bucket_id, so.name, public.aif_asset_meta_size(so.metadata) as size_bytes into v_obj
  from storage.objects so where so.id = v_expected;
  if found and v_obj.bucket_id = v_asset.bucket and v_obj.name = v_asset.path and v_obj.size_bytes is not null and v_obj.size_bytes = v_asset.bytes then
    update public.aif_assets set state = 'ready', object_id = v_expected, stored_at = clock_timestamp(), unknown_since = null, updated_at = now() where id = p_asset;
    return 'ready';
  end if;
  if v_asset.state = 'reserved' then
    update public.aif_assets set state = 'unknown', unknown_since = clock_timestamp(), object_id = coalesce(v_asset.object_id, p_expected_object_id), updated_at = now() where id = p_asset;
  end if;
  return 'unknown';
end $$;
revoke all on function public.aif_asset_reconcile(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.aif_asset_reconcile(uuid, uuid, uuid) to service_role;

-- ───────────────────────── 8. 원격 요청 전 중단(유일한 해제 경로) ─────────────────────────
-- 호출부(API store)가 "저장소에 요청을 보내지 않았다"를 보장할 때만 부른다(R2-2 최종). 원격 응답을 받은 뒤에는 절대 부르지 않는다.
create or replace function public.aif_asset_abort_local(p_asset uuid, p_user uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare v_asset record;
begin
  perform pg_advisory_xact_lock(hashtext('aif_user:' || p_user::text));
  perform pg_advisory_xact_lock(hashtext('aif_asset:' || p_asset::text));
  select * into v_asset from public.aif_assets t where t.id = p_asset and t.user_id = p_user for update;
  if not found then return 'NOT_FOUND'; end if;
  if v_asset.state <> 'reserved' then return 'INVALID_STATE'; end if;   -- unknown은 여기서도 풀 수 없다
  update public.aif_assets set state = 'failed', updated_at = now() where id = p_asset;
  return 'failed';
end $$;
revoke all on function public.aif_asset_abort_local(uuid, uuid) from public, anon, authenticated;
grant execute on function public.aif_asset_abort_local(uuid, uuid) to service_role;

-- ───────────────────────── 9. 삭제 예약·표시(다음 단위용, 이번에 호출부 없음) ─────────────────────────
-- 수정 2(Master msg_6e34a04e985b): 경로는 canonical 모양이어야 하고 경로 안의 id가 p_asset과 같아야 한다(고아도 동일).
-- 기존 aif_assets 행이 있으면 owner·bucket·path·id가 전부 일치해야 하고, 쓰는 중(reserved/ready/unknown)이면 거절.
-- 기존 예약 행(conflict)이 있으면 owner·bucket·path가 불변인지 대조한 뒤에만 토큰을 다시 발급한다. 타 회원 경로는 어떤 경우에도 0.
create or replace function public.aif_asset_claim_delete(p_asset uuid, p_user uuid, p_bucket text, p_path text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_asset record; v_del record; v_token uuid := gen_random_uuid(); v_path_id text;
begin
  if p_bucket <> 'aif-assets' then raise exception 'ACCESS_DENIED' using errcode = 'P0001'; end if;
  -- canonical 경로: {uid}/{kind}/{id}.{ext} — uid는 p_user, id는 p_asset과 같아야 한다
  if p_path !~ ('^' || p_user::text || '/(ref_face|ref_place|ref_product|generated)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|heic)$') then
    raise exception 'ACCESS_DENIED' using errcode = 'P0001';
  end if;
  v_path_id := substring(p_path from '/([0-9a-f-]{36})\.[a-z]+$');
  if v_path_id is null or v_path_id::uuid <> p_asset then raise exception 'ACCESS_DENIED' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtext('aif_user:' || p_user::text));
  perform pg_advisory_xact_lock(hashtext('aif_asset:' || p_asset::text));
  select * into v_asset from public.aif_assets t where t.id = p_asset for update;
  if found then
    if v_asset.user_id <> p_user or v_asset.bucket <> p_bucket or v_asset.path <> p_path then raise exception 'ACCESS_DENIED' using errcode = 'P0001'; end if;
    if v_asset.state in ('reserved','ready','unknown') then raise exception 'ASSET_IN_USE' using errcode = 'P0001'; end if;
  end if;
  select * into v_del from public.aif_asset_deletions t where t.asset_id = p_asset for update;
  if found then
    if v_del.user_id <> p_user or v_del.bucket <> p_bucket or v_del.path <> p_path then raise exception 'ACCESS_DENIED' using errcode = 'P0001'; end if;
    if v_del.state not in ('cancelled','delete_failed') then raise exception 'DELETION_BUSY' using errcode = 'P0001'; end if;
    update public.aif_asset_deletions set state = 'claimed', fencing_token = v_token, updated_at = now() where asset_id = p_asset;
  else
    insert into public.aif_asset_deletions (asset_id, user_id, bucket, path, state, fencing_token)
    values (p_asset, p_user, p_bucket, p_path, 'claimed', v_token);
  end if;
  return v_token;
end $$;
revoke all on function public.aif_asset_claim_delete(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.aif_asset_claim_delete(uuid, uuid, text, text) to service_role;

-- 수정 3(Master msg_6e34a04e985b): 예약 행의 회원을 먼저 확인 → 회원 잠금 → 자산 잠금 → 행·토큰·상태 재확인. 전이 행렬을 고정하고 deleted에서의 되살림은 없다.
--   claimed → deleting | cancelled
--   deleting → deleted | delete_failed | delete_unknown
--   delete_unknown → deleted | delete_failed   (조회로 확정된 결과만)
--   delete_failed → (claim_delete로 재예약만, 여기서는 전이 없음)
--   deleted, cancelled → 전이 없음
create or replace function public.aif_asset_delete_mark(p_asset uuid, p_user uuid, p_token uuid, p_state text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_del record; v_ok boolean; v_rows integer;
begin
  -- 수정 5(Mac F05): NULL 인자는 모두 명시 거절(fail-closed). NULL과의 <> 비교는 NULL이 되어 거절되지 않으므로 IS DISTINCT FROM을 쓴다.
  if p_asset is null or p_user is null or p_token is null or p_state is null then return false; end if;
  if p_state not in ('deleting','deleted','delete_failed','delete_unknown','cancelled') then raise exception 'INVALID' using errcode = '22023'; end if;
  -- 1) 잠금 전 회원 확인(타 회원 예약을 잠그지 않도록)
  select t.user_id into v_del from public.aif_asset_deletions t where t.asset_id = p_asset;
  if not found or v_del.user_id is distinct from p_user then return false; end if;
  -- 2) 회원 → 자산 잠금
  perform pg_advisory_xact_lock(hashtext('aif_user:' || p_user::text));
  perform pg_advisory_xact_lock(hashtext('aif_asset:' || p_asset::text));
  -- 3) 잠금 뒤 행·토큰·상태 재확인
  select * into v_del from public.aif_asset_deletions t where t.asset_id = p_asset and t.user_id = p_user for update;
  if not found or v_del.fencing_token is distinct from p_token or v_del.state is null then return false; end if;
  v_ok := (v_del.state = 'claimed' and p_state in ('deleting','cancelled'))
       or (v_del.state = 'deleting' and p_state in ('deleted','delete_failed','delete_unknown'))
       or (v_del.state = 'delete_unknown' and p_state in ('deleted','delete_failed'));
  if not coalesce(v_ok, false) then return false; end if;
  update public.aif_asset_deletions set state = p_state, attempts = attempts + (case when p_state = 'deleting' then 1 else 0 end), updated_at = now()
  where asset_id = p_asset and user_id = p_user and fencing_token = p_token and state = v_del.state;
  get diagnostics v_rows = row_count;
  return v_rows = 1;   -- 실제로 1행이 바뀌었을 때만 true
end $$;
revoke all on function public.aif_asset_delete_mark(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.aif_asset_delete_mark(uuid, uuid, uuid, text) to service_role;

-- ───────────────────────── 10. 이 파일에 없는 것(의도) ─────────────────────────
-- * storage.buckets 'aif-assets' 생성(private, 20MB, mime 5종) — 별도 승인 후 생성.
-- * storage_posting_tracked_buckets 등록·member_mark_posted 호출 — W07 게시 성공 때.
-- * programs.version 갱신 — 배포 때.
-- * 중앙 quota/retention 함수·표 수정 — 없음.
