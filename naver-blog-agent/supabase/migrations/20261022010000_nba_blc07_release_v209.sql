-- Applied after Ready dpl_B6ng8tG17guwDz7qzN4WKCRWB1Fj; metadata only (BLC-07 input verification).
update public.programs set version='v2.09', extension_version='v2.09', updated_at=now()
where slug='naver-blog-agent' and version='v2.08';
