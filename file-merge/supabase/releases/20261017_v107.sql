-- Execute only after verified file-merge v1.07 production deployment.
update public.programs set version='v1.07', updated_at=now() where slug='file-merge';
select slug,version,app_url,badges from public.programs where slug='file-merge';
