-- real-estate-sales v1.33: 전월세 거래 (운영 DB esgxyikcnnvmlhygjkth)
alter table public.real_estate_listings add column if not exists monthly_rent bigint;
update public.real_estate_listings set deal_type = '매매' where deal_type is null;
create index if not exists idx_real_estate_listings_deal on public.real_estate_listings (sgg_cd, deal_type, collected_at desc);
alter table public.real_estate_user_preferences add column if not exists deal_types text[];
update public.programs set version = 'v1.33', updated_at = now() where slug = 'real-estate-sales' returning slug, version;
