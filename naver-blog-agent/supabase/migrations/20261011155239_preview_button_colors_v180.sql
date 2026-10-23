-- Release metadata only. Apply after successful v1.80 production deployment.
update public.programs
set version = 'v1.80', extension_version = 'v1.80',
    extension_download_url = 'https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-agent';
