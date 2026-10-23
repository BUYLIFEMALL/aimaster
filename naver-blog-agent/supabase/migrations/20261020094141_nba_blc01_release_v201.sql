-- Release metadata; run after the v2.01 deployment is Ready.
-- Guard preserves newer versions if this historical file is replayed later.
update public.programs
set version = 'v2.01',
    extension_version = 'v2.01',
    extension_download_url = 'https://naver-blog-agent.buylife.xyz/downloads/naver-blog-agent-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-agent' and version in ('v2.00', 'v2.01');
