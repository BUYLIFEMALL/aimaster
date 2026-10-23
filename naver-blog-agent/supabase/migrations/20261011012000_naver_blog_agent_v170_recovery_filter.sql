-- Release metadata only. Apply after production READY, then verify the live ZIP.
update public.programs
set version = 'v1.70', extension_version = 'v1.70',
    extension_download_url = 'https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-agent';
