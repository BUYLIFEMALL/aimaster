-- AI Influencer W01r — 객체 없는 ready 자산을 missing으로 정리(복구 P2) 초안.
-- ★ 초안이다. 어떤 DB에도 실행하지 않았다(2026-11-18, 격리 DB 포함). 실행은 격리 DB 계약 시험 배정 뒤, 운영 적용은 별도 승인.
-- 설계: docs/analysis-ai-influencer-20261118/W00_BASELINE.md §20-6(부재가 증거가 되는 이유)·§20-8(확정안), Master msg_a289fd0c172a.
-- 작성: Claude(SNS) CC-SNS-01, 세션 claude-win-20261118-sns.
--
-- 전제: 20261118120000_aif_assets_a1.sql(A1 원문)이 먼저 적용돼 있어야 한다. 이 파일은 A1 원문을 고치지 않는다(기존 표 정의·함수 본문 무변경).
--   A1 원문이 영속 DB에 적용된 적이 있는지와 무관하게 쓸 수 있도록 「추가만」 한다: 열 2개·색인 2개·함수 2개.
--
-- 왜 필요한가
--   ready는 finalize·reconcile이 「그 객체가 저장소에 있음」을 확인한 뒤에만 되는 상태다. 그런데 그 뒤에 객체가 사라질 수 있다 —
--   중앙 보관 정리는 보관 연장 회원의 기간 지난 파일을 저장소에서 직접 지우고 우리 aif_assets 행은 그대로 둔다. 그런 행은 조회에서 계속 실패하고
--   보관 정리의 신규 묶음 앞자리를 차지한다.
-- 왜 이 경우만 「없다」가 증거인가
--   ready 자산의 경로에 다시 쓸 주체가 없다(경로는 자산당 하나, 업로드는 예약당 한 번·upsert 금지, ready면 그 업로드는 이미 끝났다).
--   업로드 불명(unknown)·예약(reserved)과 달리 「지금 없으면 나중에 생긴다」가 성립하지 않는다. 그래서 이 파일의 함수는 ready만 다룬다.
--
-- 지키는 것
--   * 판정은 두 기준 모두다: storage.objects에 그 object_id의 행도 없고, 그 bucket·name의 행도 없을 때만 missing.
--     경로에 다른 id의 객체가 있거나, 그 id가 다른 자리(bucket·name)에 있으면 자동으로 아무것도 하지 않는다(other_object).
--   * storage.objects를 읽지 못하면(권한·없는 표 등) 예외가 나고 거래가 되돌려진다 — 「0행」으로 오인해 missing으로 바꾸지 않는다.
--   * 대상은 모든 회원이다. 보호 여부·보관 정책을 보지 않는다(객체가 없다는 것은 회원 등급과 무관한 사실).
--   * 삭제 예약 행은 지우지 않는다. missing이 된 자산의 비활성 예약(cancelled·delete_failed)에는 parked_at만 기록해
--     state·fencing_token·attempts·claimed_at을 그대로 보존한다. 정리 실행자의 「이어 하기」 목록은 parked_at is null 조건으로 그 행을 읽지 않는다.
--   * 기존 함수(expire·claim_delete·delete_mark·delete_verify 등)의 동작은 바꾸지 않는다. aif_asset_expire는 ready·expired가 아니면 skip이므로
--     missing 자산은 삭제 흐름에 들어가지 않는다.
--   * 재업로드·재생성·저장소 삭제 요청은 이 파일 어디에도 없다.
-- 보장하지 않는 것(§20-8 (5))
--   * 발견 시한·무기아: 훑기는 회차마다 정해진 수만 읽고 확인한 행을 뒤로 보내 순환하도록 했을 뿐이다. ready가 많으면 한 바퀴가 길다.
--   * 훑기가 정확히 p_scan_limit행을 「검사」한다는 것: 잠긴 행은 건너뛴다(기다리지 않음). 건너뛴 만큼 색인을 더 읽을 수 있고, 건너뛴 행은 그 회차에 확인되지 않는다.
--   * storage.objects 행의 부재는 「저장소 API로 접근할 수 없다」는 뜻이지 물리 파일 삭제의 증명이 아니다. 저장소 복원으로 행이 돌아오면 missing은 사람이 되돌린다.
--   * 실제 Supabase에서 함수 소유자의 storage.objects 읽기 권한, 실제 실행 시간은 이 초안으로 확인되지 않는다.

-- ───────────────────────── 1. 열 ─────────────────────────
-- 마지막으로 「객체가 있는지」를 확인한 시각. 훑기의 순환 정렬에만 쓴다(보관 기간·용량 판정에 쓰지 않는다). NULL = 아직 확인한 적 없음.
alter table public.aif_assets add column if not exists object_checked_at timestamptz;
-- 자산이 missing이 되어 더 진행할 일이 없는 비활성 예약에 찍는 표시. NULL = 정리 실행자가 읽는 예약.
alter table public.aif_asset_deletions add column if not exists parked_at timestamptz;

-- ───────────────────────── 2. 색인 ─────────────────────────
-- 훑기의 정렬 `order by object_checked_at asc nulls first, id asc`와 **같은 순서**의 색인(ready 행만).
-- btree의 기본 NULL 위치는 ASC에서 NULLS LAST라서, NULLS FIRST를 명시하지 않으면 이 정렬에 쓰이지 않는다.
create index if not exists aif_assets_ready_checked_idx
  on public.aif_assets (object_checked_at asc nulls first, id asc) where state = 'ready';
-- 정리 실행자의 「이어 하기」·「확인만」 목록(state in (…) and parked_at is null order by updated_at)용.
create index if not exists aif_asset_deletions_unparked_idx
  on public.aif_asset_deletions (state, updated_at) where parked_at is null;

-- ───────────────────────── 3. 훑기(후보 찾기) ─────────────────────────
-- ready 행을 정해진 수만 읽어 객체 존재를 분류하고, 「객체가 id로도 경로로도 없는」 후보를 돌려준다. 판정은 하지 않는다(aif_asset_mark_missing이 잠금 안에서 다시 본다).
-- ★ 읽기 전용이 아니다: 확인이 끝난 행(present·other_object)의 object_checked_at을 갱신해 다음 회차에는 뒤에서 읽히게 한다. 후보(absent)는 갱신하지 않는다.
--
-- 인자(둘은 서로 다른 상한이다)
--   p_scan_limit — 이번에 읽을 ready 행 수의 상한(탐색 창). 1 미만·NULL이면 예외. 5000 초과는 5000으로 줄인다.
--   p_limit      — 돌려줄 후보 수의 상한. 1 미만·NULL이면 예외. 500 초과는 500으로, p_scan_limit 초과는 p_scan_limit으로 줄인다.
-- 반환(jsonb 한 값) — 「조회 결과」와 「변경한 행」을 구분해 싣는다
--   scan_limit·limit — 실제로 쓴 상한(줄인 뒤의 값)
--   scanned      — 읽은 ready 행 수(≤ scan_limit). 잠겨 있어 건너뛴 행은 들어 있지 않다
--   present      — 기대한 객체(id·bucket·name 일치)가 있는 행 수
--   other_object — 그 id가 없는데 경로에 다른 객체가 있거나, 그 id가 다른 자리에 있는 행 수(자동 조치 없음. 행 자체는 돌려주지 않는다)
--   absent       — id로도 경로로도 객체가 없는 행 수(창 안 전체)
--   touched      — object_checked_at을 갱신한 행 수(= present + other_object). 이 함수가 바꾼 것은 이것뿐이다
--   candidates   — absent 행 중 정렬 순서 앞에서부터 최대 limit개의 [{asset_id, user_id}]. absent > limit이면 나머지는 다음 회차에 다시 읽힌다
-- 정렬: (object_checked_at asc nulls first, id asc) — 유일키(id)를 포함하므로 같은 시각의 행도 순서가 정해진다. 한 호출이 갱신하는 시각은 모두 같은 now()다.
-- 잠금: 행 잠금만 잡고 잠긴 행은 건너뛴다(for update skip locked). 권고 잠금(회원·자산)을 잡지 않으므로 다른 함수와 교착의 한쪽이 되지 않는다.
create or replace function public.aif_asset_missing_scan(p_scan_limit integer, p_limit integer)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_scan integer; v_limit integer; v_out jsonb;
begin
  if p_scan_limit is null or p_limit is null or p_scan_limit < 1 or p_limit < 1 then
    raise exception 'INVALID' using errcode = '22023';
  end if;
  v_scan := least(p_scan_limit, 5000);
  v_limit := least(p_limit, 500, v_scan);

  with win as materialized (
    select a.id, a.user_id, a.bucket, a.path, a.object_id, a.object_checked_at
    from public.aif_assets a
    where a.state = 'ready'
    order by a.object_checked_at asc nulls first, a.id asc
    limit v_scan
    for update skip locked
  ),
  cls as materialized (
    select w.id, w.user_id,
           case
             when exists (select 1 from storage.objects so where so.id = w.object_id and so.bucket_id = w.bucket and so.name = w.path) then 'present'
             when not exists (select 1 from storage.objects so where so.id = w.object_id)
              and not exists (select 1 from storage.objects so where so.bucket_id = w.bucket and so.name = w.path) then 'absent'
             else 'other_object'
           end as kind,
           row_number() over (order by w.object_checked_at asc nulls first, w.id asc) as rn
    from win w
  ),
  ranked as materialized (
    select c.id, c.user_id, c.kind, row_number() over (partition by c.kind order by c.rn) as kind_rn
    from cls c
  ),
  touched as (
    update public.aif_assets a set object_checked_at = now()
    from cls c
    where a.id = c.id and c.kind <> 'absent'
    returning a.id
  )
  select jsonb_build_object(
    'scan_limit', v_scan,
    'limit', v_limit,
    'scanned', (select count(*) from cls),
    'present', (select count(*) from cls c where c.kind = 'present'),
    'other_object', (select count(*) from cls c where c.kind = 'other_object'),
    'absent', (select count(*) from cls c where c.kind = 'absent'),
    'touched', (select count(*) from touched),
    'candidates', coalesce((
      select jsonb_agg(jsonb_build_object('asset_id', r.id, 'user_id', r.user_id) order by r.kind_rn)
      from ranked r where r.kind = 'absent' and r.kind_rn <= v_limit), '[]'::jsonb)
  ) into v_out;
  return v_out;
end $$;
revoke all on function public.aif_asset_missing_scan(integer, integer) from public, anon, authenticated;
grant execute on function public.aif_asset_missing_scan(integer, integer) to service_role;

-- ───────────────────────── 4. 판정(ready → missing) ─────────────────────────
-- 잠금 순서는 기존 함수와 같다: 회원(aif_user:<uid>) → 자산(aif_asset:<id>). 반환값:
--   missing      — 객체가 id로도 경로로도 없어 missing으로 바꿨다(이미 missing이면 그대로 missing — 멱등).
--   present      — 기대한 객체가 있다. 자산 상태 무변경.
--   other_object — 경로에 다른 객체가 있거나 그 id가 다른 자리에 있다. 자산 상태 무변경, 자동 조치 없음.
--   busy         — 삭제 예약이 claimed·deleting·delete_unknown·deleted이거나 예약 행의 소유·경로가 자산과 다르다.
--                  (ready와 함께 있을 수 없는 조합이다 — 보이면 건드리지 않는다.) 자산 상태 무변경.
--   skip         — 없는 자산·다른 회원·NULL 인자·ready가 아닌 상태(reserved·unknown·failed·expired).
-- ready로 남기는 반환(present·other_object·busy)에서는 object_checked_at만 갱신한다 → 바꾸지 못한 후보가 훑기 창의 앞자리에 남지 않게.
-- missing으로 바꿀 때 그 자산의 비활성 예약(cancelled·delete_failed)에는 같은 거래에서 parked_at을 기록한다(행·토큰·시도 횟수 보존).
create or replace function public.aif_asset_mark_missing(p_asset uuid, p_user uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_asset record; v_del record; v_has_del boolean := false;
  v_same boolean; v_id_any boolean; v_path_any boolean; v_rows integer;
begin
  if p_asset is null or p_user is null then return 'skip'; end if;
  perform pg_advisory_xact_lock(hashtext('aif_user:' || p_user::text));
  perform pg_advisory_xact_lock(hashtext('aif_asset:' || p_asset::text));
  select * into v_asset from public.aif_assets t where t.id = p_asset and t.user_id = p_user for update;
  if not found then return 'skip'; end if;
  if v_asset.state = 'missing' then return 'missing'; end if;
  if v_asset.state <> 'ready' then return 'skip'; end if;

  select * into v_del from public.aif_asset_deletions t where t.asset_id = p_asset for update;
  v_has_del := found;
  if v_has_del and (v_del.user_id is distinct from p_user or v_del.bucket is distinct from v_asset.bucket or v_del.path is distinct from v_asset.path
                    or v_del.state not in ('cancelled','delete_failed')) then
    update public.aif_assets set object_checked_at = now() where id = p_asset and user_id = p_user and state = 'ready';
    return 'busy';
  end if;

  -- 저장소 조회 세 번. 읽지 못하면 예외가 나고 이 거래 전체가 되돌려진다(0행으로 오인하지 않는다).
  select exists (select 1 from storage.objects so where so.id = v_asset.object_id and so.bucket_id = v_asset.bucket and so.name = v_asset.path) into v_same;
  select exists (select 1 from storage.objects so where so.id = v_asset.object_id) into v_id_any;
  select exists (select 1 from storage.objects so where so.bucket_id = v_asset.bucket and so.name = v_asset.path) into v_path_any;

  if v_same then
    update public.aif_assets set object_checked_at = now() where id = p_asset and user_id = p_user and state = 'ready';
    return 'present';
  end if;
  if v_id_any or v_path_any then
    update public.aif_assets set object_checked_at = now() where id = p_asset and user_id = p_user and state = 'ready';
    return 'other_object';
  end if;

  update public.aif_assets
     set state = 'missing', missing_reason = 'object_absent', object_checked_at = now(), updated_at = now()
   where id = p_asset and user_id = p_user and state = 'ready' and object_id = v_asset.object_id;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then return 'skip'; end if;
  if v_has_del then
    update public.aif_asset_deletions set parked_at = now()
     where asset_id = p_asset and user_id = p_user and state in ('cancelled','delete_failed') and parked_at is null;
  end if;
  return 'missing';
end $$;
revoke all on function public.aif_asset_mark_missing(uuid, uuid) from public, anon, authenticated;
grant execute on function public.aif_asset_mark_missing(uuid, uuid) to service_role;

-- ───────────────────────── 5. 이 파일에 없는 것(의도) ─────────────────────────
-- * A1 원문의 표 정의·기존 함수 본문 변경 — 없음.
-- * parked_at을 푸는 함수(사람이 missing을 되돌릴 때) — 운영자 승인 전이 단위(P4).
-- * other_object 행을 보여 주는 조회 — 읽기 전용 집계 단위(P3). 지금은 건수만 알 수 있다.
-- * 정리 실행자·라우트의 연결(묶음 D, 목록 조건 parked_at is null) — 런타임 단위에서.
-- * 저장소 삭제·재업로드·버킷·예약 실행 등록 — 없음.
