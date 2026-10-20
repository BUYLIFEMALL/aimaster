-- AIMaster production ref esgxyikcnnvmlhygjkth; apply after deployment Ready.
update public.programs
set version = 'v2.04', extension_version = 'v2.04',
    extension_download_url = 'https://naver-blog-agent.buylife.xyz/downloads/naver-blog-agent-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-agent' and version in ('v2.03', 'v2.04');
