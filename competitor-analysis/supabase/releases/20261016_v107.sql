-- Apply only after production READY; preserve badges, app_url, member data and permissions.
begin;
update public.programs set version='v1.07',updated_at=now() where slug='competitor-analysis' and version in ('v1.06','v1.07');
do $$ begin if not exists(select 1 from public.programs where slug='competitor-analysis' and version='v1.07') then raise exception 'competitor-analysis version changed concurrently'; end if; end $$;
commit;
select slug,version,app_url,badges from public.programs where slug='competitor-analysis';
