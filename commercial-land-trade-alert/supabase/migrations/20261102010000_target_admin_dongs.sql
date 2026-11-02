-- 감시 화면별 「알림 받을 행정동」(2026-11-02 주인님 「진행해」, 플랜 PLAN_20261101_ADMIN_DONG 3단계). 운영 DB esgxyikcnnvmlhygjkth.
-- 값은 「시군구코드|행정동」(예: 11680|역삼1동). 비면 전체. 판정은 회원 PC 확장에서만 하고 매물·좌표는 서버로 오지 않는다. RLS는 기존 표 정책 그대로.
alter table public.commercial_land_listing_targets
  add column if not exists admin_dongs text[] not null default '{}';
