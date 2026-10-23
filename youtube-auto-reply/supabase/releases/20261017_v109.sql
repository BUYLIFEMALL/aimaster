-- Release metadata only; no schema/member data/permissions changed.
update public.programs set version='v1.09', updated_at=now() where slug='youtube-auto-reply';
select slug,version,app_url from public.programs where slug='youtube-auto-reply';
