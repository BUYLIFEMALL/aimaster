-- Program display version only; no schema or member data changes.
update public.programs
set version = 'v1.45', updated_at = now()
where slug = 'naver-blog-agent';
