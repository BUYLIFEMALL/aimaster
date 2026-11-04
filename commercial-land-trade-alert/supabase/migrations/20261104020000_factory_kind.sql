-- v1.31 공장·창고(국토부 InduTrade) 실거래 추가 (대상 DB: AIMaster 운영 esgxyikcnnvmlhygjkth)
-- 종류 제약에 factory만 더한다. 기존 줄·회원 조건 기본값(building, land)은 그대로 — 공장·창고는 회원이 조건 화면에서 켤 때만 알림.
alter table public.commercial_land_trades drop constraint if exists commercial_land_trades_kind_check;
alter table public.commercial_land_trades add constraint commercial_land_trades_kind_check check (kind in ('building', 'land', 'factory'));
