-- Applied after Ready dpl_38yCfeG8v7dgu6UT7VhmzGvVJcxJ; metadata only.
update public.programs set version='v2.08', extension_version='v2.08', updated_at=now()
where slug='naver-blog-agent' and version='v2.07';
