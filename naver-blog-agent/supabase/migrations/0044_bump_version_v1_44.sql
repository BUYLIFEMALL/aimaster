-- Program display version only; no schema or member data changes.
update public.programs
set version = 'v1.44', updated_at = now()
where slug = 'naver-blog-agent';
