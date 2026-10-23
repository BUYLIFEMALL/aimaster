-- AIMaster production ref esgxyikcnnvmlhygjkth; apply after deployment Ready.
update public.programs set version='v2.05', extension_version='v2.05', updated_at=now()
where slug='naver-blog-agent' and version in ('v2.04','v2.05');
