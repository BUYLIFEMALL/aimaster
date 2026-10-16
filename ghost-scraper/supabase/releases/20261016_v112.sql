-- v1.12 production READY 확인 후 적용. 스키마·회원 권한·배지는 바꾸지 않는다.
begin;
update public.programs set version='v1.12', updated_at=now() where slug='website-scraper' and version in ('v1.11','v1.12');
do $$ begin if not exists(select 1 from public.programs where slug='website-scraper' and version='v1.12') then raise exception 'website-scraper version changed concurrently'; end if; end $$;
commit;
select slug,version,app_url,badges from public.programs where slug='website-scraper';
