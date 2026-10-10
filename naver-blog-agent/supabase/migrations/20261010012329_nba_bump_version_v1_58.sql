-- v1.58: result actions aligned right; blue background/white text for draft save.
-- Apply after successful production deployment.
update public.programs
set version = 'v1.58',
    extension_version = 'v1.58',
    extension_download_url = 'https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-agent';
