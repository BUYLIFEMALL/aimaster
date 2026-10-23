-- Display version only; existing member accounts and categories remain unchanged.
update public.programs
set version = 'v1.40', updated_at = now()
where slug = 'naver-blog-agent';
