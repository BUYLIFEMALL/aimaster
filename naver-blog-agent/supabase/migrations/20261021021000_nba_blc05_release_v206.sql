-- Applied after Ready dpl_4HAF9CEsuJiEEv1eJjNN9YB4jYhN; metadata only.
update public.programs set version='v2.06', extension_version='v2.06', updated_at=now()
where slug='naver-blog-agent' and version='v2.05';
