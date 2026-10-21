-- Applied after Ready dpl_GUZGHbBMEMCs1HW6MDauHGDgJPp6; metadata only.
update public.programs set version='v2.07', extension_version='v2.07', updated_at=now()
where slug='naver-blog-agent' and version='v2.06';
