-- real-estate-sales v1.31: 건물 유형(아파트/빌라/오피스텔), 회원이 받을 유형 (운영 DB esgxyikcnnvmlhygjkth)
alter table public.real_estate_listings add column if not exists property_type text;
update public.real_estate_listings
set property_type = case raw_data->>'BLDG_USG' when '연립다세대' then '빌라' when '오피스텔' then '오피스텔' else '아파트' end
where property_type is null;
create index if not exists idx_real_estate_listings_type on public.real_estate_listings (sgg_cd, property_type, collected_at desc);
alter table public.real_estate_user_preferences add column if not exists property_types text[];
select property_type, count(*) from public.real_estate_listings group by 1 order by 2 desc;
