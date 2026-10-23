-- Apply after verified real-estate-sales v1.11 production deployment.
update public.programs set version='v1.11',updated_at=now() where slug='real-estate-sales';
select slug,version,app_url,badges from public.programs where slug='real-estate-sales';
