-- Keep the AIMaster catalog version synchronized with the application sidebar.
update public.programs
set version = 'v1.31', updated_at = now()
where slug = 'naver-blog-agent';
