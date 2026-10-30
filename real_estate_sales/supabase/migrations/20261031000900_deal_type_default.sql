-- v1.33 보정: 새 매매 줄 거래 종류 기본값 (운영 DB esgxyikcnnvmlhygjkth)
alter table public.real_estate_listings alter column deal_type set default '매매';
