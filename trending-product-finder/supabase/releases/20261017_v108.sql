-- Release metadata only; preserve badges, access and app URL.
update public.programs set version='v1.08',updated_at=now() where slug='trending-product-finder';
select slug,version,app_url from public.programs where slug='trending-product-finder';
