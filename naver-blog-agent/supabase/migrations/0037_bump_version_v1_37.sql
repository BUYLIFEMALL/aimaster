-- Only synchronize the program display version; no schema or member data changes.
update public.programs
set version = 'v1.37', updated_at = now()
where slug = 'naver-blog-agent';
