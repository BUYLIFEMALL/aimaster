-- 지역(자치구)별 "마지막으로 공공 API에서 실제로 수집한 시각"을 기록.
-- 같은 지역을 여러 사용자가 서로 다른 주기로 watch할 때, 이미 충분히 최근에
-- 수집됐으면 dispatch 라우트가 외부 API를 다시 호출하지 않고 기존 DB 데이터를
-- 재사용하도록 하기 위한 내부 상태 테이블 (service role만 접근, 사용자 노출 없음).
create table if not exists real_estate_district_collect_state (
  sgg_cd text primary key,
  last_collected_at timestamptz not null default now()
);

alter table real_estate_district_collect_state enable row level security;
-- 정책을 두지 않아 service role(관리자 클라이언트)만 접근 가능 — 일반 사용자는 조회/쓰기 불가.
