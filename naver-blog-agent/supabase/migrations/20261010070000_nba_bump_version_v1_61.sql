-- v1.61: per-post Naver categories and verified, deduplicated tags.
-- Version metadata only; no schema changes or draft content updates.
update public.programs
set version = 'v1.61',
    extension_version = 'v1.61',
    extension_download_url = 'https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-agent';
