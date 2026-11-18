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
declare a record; o record;
begin
  perform pg_advisory_xact_lock(hashtext('aif_user:' || p_user::text));
  perform pg_advisory_xact_lock(hashtext('aif_asset:' || p_asset::text));
  select * into a from public.aif_assets x where x.id = p_asset and x.user_id = p_user for update;
  if not found then return 'NOT_FOUND'; end if;
  if a.state = 'ready' then return 'ready'; end if;
  if a.state not in ('reserved','unknown') then return 'INVALID_STATE'; end if;
  if exists (select 1 from public.aif_asset_deletions d where d.asset_id = p_asset and d.state in ('claimed','deleting','delete_unknown')) then
    return 'ASSET_DELETION_IN_PROGRESS';
  end if;
  if p_object_id is null then
    update public.aif_assets set state = 'unknown', unknown_since = coalesce(unknown_since, clock_timestamp()), updated_at = now() where id = p_asset;
    return 'unknown';
  end if;
  select o.id, o.bucket_id, o.name, nullif(o.metadata->>'size','')::bigint as size into o
  from storage.objects o where o.id = p_object_id;
  if not found or o.bucket_id <> a.bucket or o.name <> a.path or o.size is distinct from a.bytes then
    -- 객체가 우리 예약과 다르다(다른 쓰기·크기 불일치). failed로 단정하지 않고 unknown 유지(R2-2).
    update public.aif_assets set state = 'unknown', unknown_since = coalesce(unknown_since, clock_timestamp()), updated_at = now() where id = p_asset;
    return 'unknown';
  end if;
  update public.aif_assets set state = 'ready', object_id = p_object_id, stored_at = clock_timestamp(), unknown_since = null, updated_at = now() where id = p_asset;
  return 'ready';
end $$;
revoke all on function public.aif_asset_finalize(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.aif_asset_finalize(uuid, uuid, uuid) to service_role;

-- ───────────────────────── 7. 대조(reconcile) ─────────────────────────
-- 객체가 있고 bucket·name·size가 맞으면 ready. 객체 없음·불일치·조회 불명은 모두 바꾸지 않는다(R2-2: 시간·횟수·부재는 failed 근거 아님).
create or replace function public.aif_asset_reconcile(p_asset uuid, p_user uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare a record; o record;
begin
  perform pg_advisory_xact_lock(hashtext('aif_user:' || p_user::text));
  perform pg_advisory_xact_lock(hashtext('aif_asset:' || p_asset::text));
  select * into a from public.aif_assets x where x.id = p_asset and x.user_id = p_user for update;
  if not found then return 'NOT_FOUND'; end if;
  if a.state not in ('reserved','unknown') then return a.state; end if;
  if exists (select 1 from public.aif_asset_deletions d where d.asset_id = p_asset and d.state in ('claimed','deleting','delete_unknown')) then
    return 'ASSET_DELETION_IN_PROGRESS';
  end if;
  select o.id, nullif(o.metadata->>'size','')::bigint as size into o
  from storage.objects o where o.bucket_id = a.bucket and o.name = a.path;
  if found and o.size = a.bytes then
    update public.aif_assets set state = 'ready', object_id = o.id, stored_at = clock_timestamp(), unknown_since = null, updated_at = now() where id = p_asset;
    return 'ready';
  end if;
  if a.state = 'reserved' then
    update public.aif_assets set state = 'unknown', unknown_since = clock_timestamp(), updated_at = now() where id = p_asset;
  end if;
  return 'unknown';
end $$;
revoke all on function public.aif_asset_reconcile(uuid, uuid) from public, anon, authenticated;
grant execute on function public.aif_asset_reconcile(uuid, uuid) to service_role;

-- ───────────────────────── 8. 원격 요청 전 중단(유일한 해제 경로) ─────────────────────────
-- 호출부(API store)가 "저장소에 요청을 보내지 않았다"를 보장할 때만 부른다(R2-2 최종). 원격 응답을 받은 뒤에는 절대 부르지 않는다.
create or replace function public.aif_asset_abort_local(p_asset uuid, p_user uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare a record;
begin
  perform pg_advisory_xact_lock(hashtext('aif_user:' || p_user::text));
  perform pg_advisory_xact_lock(hashtext('aif_asset:' || p_asset::text));
  select * into a from public.aif_assets x where x.id = p_asset and x.user_id = p_user for update;
  if not found then return 'NOT_FOUND'; end if;
  if a.state <> 'reserved' then return 'INVALID_STATE'; end if;   -- unknown은 여기서도 풀 수 없다
  update public.aif_assets set state = 'failed', updated_at = now() where id = p_asset;
  return 'failed';
end $$;
revoke all on function public.aif_asset_abort_local(uuid, uuid) from public, anon, authenticated;
grant execute on function public.aif_asset_abort_local(uuid, uuid) to service_role;

-- ───────────────────────── 9. 삭제 예약·표시(다음 단위용, 이번에 호출부 없음) ─────────────────────────
create or replace function public.aif_asset_claim_delete(p_asset uuid, p_user uuid, p_bucket text, p_path text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare a record; v_token uuid := gen_random_uuid();
begin
  if p_path not like p_user::text || '/%' then raise exception 'ACCESS_DENIED' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtext('aif_user:' || p_user::text));
  perform pg_advisory_xact_lock(hashtext('aif_asset:' || p_asset::text));
  select * into a from public.aif_assets x where x.id = p_asset;
  if found and a.state in ('reserved','ready','unknown') then raise exception 'ASSET_IN_USE' using errcode = 'P0001'; end if;
  insert into public.aif_asset_deletions (asset_id, user_id, bucket, path, state, fencing_token)
  values (p_asset, p_user, p_bucket, p_path, 'claimed', v_token)
  on conflict (asset_id) do update set state = 'claimed', fencing_token = v_token, updated_at = now()
    where public.aif_asset_deletions.state in ('cancelled','delete_failed');
  if not found then raise exception 'DELETION_BUSY' using errcode = 'P0001'; end if;
  return v_token;
end $$;
revoke all on function public.aif_asset_claim_delete(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.aif_asset_claim_delete(uuid, uuid, text, text) to service_role;

create or replace function public.aif_asset_delete_mark(p_asset uuid, p_token uuid, p_state text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if p_state not in ('deleting','deleted','delete_failed','delete_unknown','cancelled') then raise exception 'INVALID' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtext('aif_asset:' || p_asset::text));
  update public.aif_asset_deletions set state = p_state, attempts = attempts + (case when p_state = 'deleting' then 1 else 0 end), updated_at = now()
  where asset_id = p_asset and fencing_token = p_token;
  get diagnostics n = row_count;
  return n = 1;
end $$;
revoke all on function public.aif_asset_delete_mark(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.aif_asset_delete_mark(uuid, uuid, text) to service_role;

-- ───────────────────────── 10. 이 파일에 없는 것(의도) ─────────────────────────
-- * storage.buckets 'aif-assets' 생성(private, 20MB, mime 5종) — 별도 승인 후 생성.
-- * storage_posting_tracked_buckets 등록·member_mark_posted 호출 — W07 게시 성공 때.
-- * programs.version 갱신 — 배포 때.
-- * 중앙 quota/retention 함수·표 수정 — 없음.
