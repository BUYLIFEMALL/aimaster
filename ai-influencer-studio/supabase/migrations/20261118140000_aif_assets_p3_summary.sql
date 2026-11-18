-- AI Influencer W01u — 멈춘 건 읽기 전용 집계(복구 P3) 초안.
-- ★ 초안이다. 어떤 DB에도 실행하지 않았다(2026-11-18, 격리 DB 포함). 실행은 격리 DB 계약 시험 배정 뒤, 운영 적용은 별도 승인.
-- 설계: docs/analysis-ai-influencer-20261118/W00_BASELINE.md §20-9(Master msg_5ffb8d03b1ee 수락·정정 반영).
-- 작성: Claude(SNS) CC-SNS-01, 세션 claude-win-20261118-sns.
--
-- 전제: 20261118120000_aif_assets_a1.sql(A1 원문) → 20261118130000_aif_assets_p2_missing.sql(P2) 다음에 적용한다(parked_at 열이 P2에 있다).
--   이 파일은 두 파일을 고치지 않는다. 「추가만」 한다: 색인 1개·함수 1개. 열 추가 0, 기존 함수 본문 변경 0.
--
-- 하는 일
--   aif_asset_stuck_summary(p_cap)가 「멈춰 있을 수 있는 건」의 건수와 나이 구간별 건수만 jsonb 한 값으로 돌려준다.
--   호출 경로는 아직 없다(화면·라우트·정리 실행자 미연결). 운영자가 대조 대상의 규모를 알 수 있게 하는 첫 수단이다.
--
-- 지키는 것
--   * 읽기만 한다. insert·update·delete·select … for update·권고 잠금이 이 파일의 함수에 없다. 함수는 stable이다
--     (stable 함수 안의 쓰기 문은 DB가 거절한다 — 읽기 전용의 구조적 근거).
--   * 식별자를 돌려주지 않는다: 회원 id·자산 id·객체 id·경로·버킷·토큰·시도 횟수 원값·오류 원문 0. 서로 다른 회원 수도 넣지 않는다.
--   * 세는 것은 두 표(aif_assets·aif_asset_deletions)에 **영속된 표지**뿐이다. storage.objects를 읽지 않는다 → 어떤 건수도 파일의 존재·삭제를 뜻하지 않는다.
--   * 두 축(assets·deletions)을 따로 센다. 한 자산이 자산 축 expired_open과 예약 축의 한 범주에 동시에 잡히는 것이 정상이다.
--     **축을 넘는 합계를 내지 않는다.** 두 축의 건수 사이에 수치 관계(예: parked와 missing의 대소)를 가정하지도 않는다.
--   * 축 안에서는 한 행이 한 범주에만 잡힌다: 자산 축은 state가 배타이고 unknown은 object_id 유무로 나뉜다.
--     예약 축은 주차 표시(parked_at)가 있으면 state와 무관하게 parked에만 잡히고, 나머지 범주는 모두 parked_at is null을 조건으로 둔다.
--   * 기준시각은 하나다: 함수 안 now()(거래 시작 시각, DB 시계). 모든 범주가 같은 값을 쓰고 as_of로 돌려준다.
--   * 한 문장(한 스냅샷)으로 읽는다. stable 함수이므로 그 스냅샷은 호출한 문장의 것이다 — 범주 사이의 시점이 같다.
-- 셀 수 없는 것(§20-9 (2))
--   * mismatch·other_object: aif_asset_delete_verify·aif_asset_missing_scan·aif_asset_mark_missing의 **반환값**일 뿐 어느 열에도 남지 않는다.
--     그때 예약은 delete_unknown(확인 시각만 갱신), 자산은 ready로 남는다. 이 집계의 delete_unknown은 「같은 객체가 남음」과 「다른 id」를 합친 수다.
-- 보장하지 않는 것
--   * p_cap은 **범주마다 돌려받는(세는) 일치 행 수의 한도**다. 조건·조인 이전에 DB가 실제로 읽는 행 수나 실행 시간의 상한이 아니다
--     (예: expired_open은 expired 행마다 예약을 찾아보고, delete_failed_gave_up·parked가 아닌 범주는 조건에 맞지 않는 행을 읽고 버릴 수 있다).
--     실행 시간은 실제 DB에서 재기 전에는 모른다. 호출 경로를 만들 때 그쪽에서 유한 대기를 건다.
--   * 한도를 넘은 범주의 count는 하한일 뿐이고(capped = true) 나이 구간은 돌려주지 않는다(null) — 정렬 없이 잘린 표본의 분포를 전체처럼 보이게 하지 않는다.
--   * delete_unknown의 나이는 「불명이 된 지」가 아니다. 진입 시각을 적는 열이 없다:
--       since_expired — 자산의 expired_at 기준(만료된 뒤 경과). 불명 기간보다 길게 나온다. 자산 행이 없거나 expired_at이 비어 있으면 no_basis.
--       last_checked  — 예약의 updated_at 기준(마지막으로 확인한 뒤 경과). 확인 함수가 부를 때마다 갱신된다.
--   * delete_failed_gave_up의 나이도 마지막 확인 시각 기준이다(aif_asset_expire가 확인 때마다 updated_at을 갱신한다).
--   * 나이 구간은 **표시용**이다. 어떤 전이·해제·재시도의 근거로도 쓰지 않는다(「오래됐다」는 원격 요청이 끝났다는 증거가 아니다).
--   * 잠금: 명시적 행 잠금·권고 잠금은 없다. 일반 조회가 잡는 표 수준의 공유 잠금(ACCESS SHARE)은 잡는다 —
--     표 구조를 바꾸는 작업(ACCESS EXCLUSIVE)과는 서로 기다린다. 정리 실행자·업로드 함수의 행 잠금·권고 잠금과는 기다리지 않는다.
--   * 돌려준 값은 그 스냅샷의 것이다. 돌려준 직후 달라질 수 있고, 다른 거래의 미커밋 변경은 보이지 않는다. 기록·누적 0.

-- ───────────────────────── 1. 색인 ─────────────────────────
-- parked 범주(parked_at is not null) 조회용. 주차된 예약만 담는 부분 색인이라 평소에는 작다.
create index if not exists aif_asset_deletions_parked_idx
  on public.aif_asset_deletions (parked_at) where parked_at is not null;

-- ───────────────────────── 2. 집계 ─────────────────────────
-- 인자
--   p_cap — 범주 하나에서 세는 일치 행 수의 한도. NULL이면 2000, 1 미만이면 1, 10000 초과면 10000으로 조인다(예외를 내지 않는다).
-- 반환(jsonb 한 값)
--   { "version": 1, "as_of": <기준시각>, "cap": <조인 뒤의 값>,
--     "assets":    { reserved, unknown_with_object_id, unknown_no_object_id, expired_open, missing },
--     "deletions": { claimed, deleting, delete_unknown, delete_failed_gave_up, parked } }
--   범주 값: { "count": n, "capped": bool, "age": { lt_1h, lt_1d, lt_7d, ge_7d, no_basis } | null }
--   delete_unknown만 age 대신 "since_expired"·"last_checked" 두 벌을 싣는다.
--   count는 최대 cap까지다. capped = true면 「cap건 이상」이라는 뜻이고 나이 구간은 null이다.
-- 범주 조건과 나이 기준 열
--   assets.reserved               state = 'reserved'                                   · created_at(예약한 시각)
--   assets.unknown_with_object_id state = 'unknown' and object_id is not null          · unknown_since(처음 unknown이 된 시각)
--   assets.unknown_no_object_id   state = 'unknown' and object_id is null              · unknown_since
--   assets.expired_open           state = 'expired'이고 그 자산의 예약이 deleted가 아님 · expired_at(expired로 바뀐 시각). aif_asset_usage_estimate의 가산 조건과 같은 식
--   assets.missing                state = 'missing'                                    · updated_at(missing으로 바뀐 시각)
--   deletions.claimed             parked_at is null and state = 'claimed'              · updated_at(예약·재예약한 시각)
--   deletions.deleting            parked_at is null and state = 'deleting'             · updated_at(deleting으로 표시한 시각)
--   deletions.delete_unknown      parked_at is null and state = 'delete_unknown'       · 위 「보장하지 않는 것」의 두 벌
--   deletions.delete_failed_gave_up  parked_at is null and state = 'delete_failed' and attempts >= 5 · updated_at(마지막 확인 시각)
--   deletions.parked              parked_at is not null(state 무관)                    · parked_at(주차한 시각)
--   세지 않는 것: ready·failed 자산, deleted 예약, 주차되지 않은 cancelled·시도 5회 미만 delete_failed.
-- 나이 구간(나이 = as_of − 기준 열. 왼쪽 포함·오른쪽 제외. 다섯 값의 합 = count)
--   lt_1h [0, 1시간) · lt_1d [1시간, 24시간) · lt_7d [24시간, 168시간) · ge_7d [168시간, ∞) · no_basis(기준 열이 NULL이거나 as_of보다 미래)
--   경계는 시간 단위(24·168시간)로 적는다 — '1 day'·'7 days'는 세션 시간대의 일광 절약 전환에서 길이가 달라진다.
create or replace function public.aif_asset_stuck_summary(p_cap integer default 2000)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_cap integer := least(greatest(coalesce(p_cap, 2000), 1), 10000);
  v_now timestamptz := now();
  v_assets jsonb;
  v_deletions jsonb;
begin
  with src as (
    (select 'a:reserved'::text as cat, a.created_at as b1, null::timestamptz as b2
       from public.aif_assets a where a.state = 'reserved' limit v_cap + 1)
    union all
    (select 'a:unknown_with_object_id', a.unknown_since, null::timestamptz
       from public.aif_assets a where a.state = 'unknown' and a.object_id is not null limit v_cap + 1)
    union all
    (select 'a:unknown_no_object_id', a.unknown_since, null::timestamptz
       from public.aif_assets a where a.state = 'unknown' and a.object_id is null limit v_cap + 1)
    union all
    (select 'a:expired_open', a.expired_at, null::timestamptz
       from public.aif_assets a
      where a.state = 'expired'
        and not exists (select 1 from public.aif_asset_deletions d where d.asset_id = a.id and d.state = 'deleted')
      limit v_cap + 1)
    union all
    (select 'a:missing', a.updated_at, null::timestamptz
       from public.aif_assets a where a.state = 'missing' limit v_cap + 1)
    union all
    (select 'd:claimed', d.updated_at, null::timestamptz
       from public.aif_asset_deletions d where d.parked_at is null and d.state = 'claimed' limit v_cap + 1)
    union all
    (select 'd:deleting', d.updated_at, null::timestamptz
       from public.aif_asset_deletions d where d.parked_at is null and d.state = 'deleting' limit v_cap + 1)
    union all
    (select 'd:delete_unknown',
            (select a.expired_at from public.aif_assets a where a.id = d.asset_id and a.user_id = d.user_id),
            d.updated_at
       from public.aif_asset_deletions d where d.parked_at is null and d.state = 'delete_unknown' limit v_cap + 1)
    union all
    (select 'd:delete_failed_gave_up', d.updated_at, null::timestamptz
       from public.aif_asset_deletions d
      where d.parked_at is null and d.state = 'delete_failed' and d.attempts >= 5 limit v_cap + 1)
    union all
    (select 'd:parked', d.parked_at, null::timestamptz
       from public.aif_asset_deletions d where d.parked_at is not null limit v_cap + 1)
  ),
  agg as (
    select s.cat,
           count(*) as n,
           count(*) filter (where s.b1 <= v_now and s.b1 >  v_now - interval '1 hour')                                   as p1,
           count(*) filter (where s.b1 <= v_now - interval '1 hour'   and s.b1 > v_now - interval '24 hours')            as p2,
           count(*) filter (where s.b1 <= v_now - interval '24 hours' and s.b1 > v_now - interval '168 hours')           as p3,
           count(*) filter (where s.b1 <= v_now - interval '168 hours')                                                  as p4,
           count(*) filter (where s.b1 is null or s.b1 > v_now)                                                          as p0,
           count(*) filter (where s.b2 <= v_now and s.b2 >  v_now - interval '1 hour')                                   as q1,
           count(*) filter (where s.b2 <= v_now - interval '1 hour'   and s.b2 > v_now - interval '24 hours')            as q2,
           count(*) filter (where s.b2 <= v_now - interval '24 hours' and s.b2 > v_now - interval '168 hours')           as q3,
           count(*) filter (where s.b2 <= v_now - interval '168 hours')                                                  as q4,
           count(*) filter (where s.b2 is null or s.b2 > v_now)                                                          as q0
      from src s
     group by s.cat
  ),
  cats (axis, key, cat) as (
    values ('assets', 'reserved', 'a:reserved'),
           ('assets', 'unknown_with_object_id', 'a:unknown_with_object_id'),
           ('assets', 'unknown_no_object_id', 'a:unknown_no_object_id'),
           ('assets', 'expired_open', 'a:expired_open'),
           ('assets', 'missing', 'a:missing'),
           ('deletions', 'claimed', 'd:claimed'),
           ('deletions', 'deleting', 'd:deleting'),
           ('deletions', 'delete_unknown', 'd:delete_unknown'),
           ('deletions', 'delete_failed_gave_up', 'd:delete_failed_gave_up'),
           ('deletions', 'parked', 'd:parked')
  ),
  shaped as (
    select c.axis, c.key,
           least(coalesce(g.n, 0), v_cap) as cnt,
           coalesce(g.n, 0) > v_cap as capped,
           jsonb_build_object('lt_1h', coalesce(g.p1, 0), 'lt_1d', coalesce(g.p2, 0), 'lt_7d', coalesce(g.p3, 0),
                              'ge_7d', coalesce(g.p4, 0), 'no_basis', coalesce(g.p0, 0)) as age1,
           jsonb_build_object('lt_1h', coalesce(g.q1, 0), 'lt_1d', coalesce(g.q2, 0), 'lt_7d', coalesce(g.q3, 0),
                              'ge_7d', coalesce(g.q4, 0), 'no_basis', coalesce(g.q0, 0)) as age2
      from cats c left join agg g on g.cat = c.cat
  ),
  obj as (
    select s.axis, s.key,
           case when s.key = 'delete_unknown'
                then jsonb_build_object('count', s.cnt, 'capped', s.capped,
                                        'since_expired', case when s.capped then null else s.age1 end,
                                        'last_checked',  case when s.capped then null else s.age2 end)
                else jsonb_build_object('count', s.cnt, 'capped', s.capped,
                                        'age', case when s.capped then null else s.age1 end)
           end as o
      from shaped s
  )
  select jsonb_object_agg(o.key, o.o) filter (where o.axis = 'assets'),
         jsonb_object_agg(o.key, o.o) filter (where o.axis = 'deletions')
    into v_assets, v_deletions
    from obj o;

  return jsonb_build_object('version', 1, 'as_of', v_now, 'cap', v_cap, 'assets', v_assets, 'deletions', v_deletions);
end $$;
revoke all on function public.aif_asset_stuck_summary(integer) from public, anon, authenticated;
grant execute on function public.aif_asset_stuck_summary(integer) to service_role;

-- ───────────────────────── 이 파일에 없는 것(후속) ─────────────────────────
-- * 호출 경로(관리자 확인을 하는 라우트·화면) — 운영 절차가 정해진 뒤. 이 함수는 서비스 키로만 불리고 안에서 관리자 여부를 확인하지 않는다.
-- * storage.objects 메타와의 대조(같은 객체·다른 id·없음 분류) — 권한·비용이 달라 별도 함수로만(§20-9 (4) 나 안, 미확정).
-- * delete_unknown 진입 시각 열 — 확인 함수 본문을 바꾸는 일이라 운영자 승인 전이 단위(P4)에서 필요성을 본다.
-- * 특정 행을 찾아 보는 수단(식별자 조회) — P4 운영 절차에서 따로 정한다. 이 집계는 건수 전용이다.
