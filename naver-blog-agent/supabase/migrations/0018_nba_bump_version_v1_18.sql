-- Bump naver-blog-agent version to v1.18
update public.programs
set version = 'v1.18',
    updated_at = now()
where slug = 'naver-blog-agent';
