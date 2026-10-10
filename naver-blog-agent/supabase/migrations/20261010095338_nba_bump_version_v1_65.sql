-- v1.65: nonblocking image-library panel, exact input rule cross-checks.
-- Metadata only. No schema or member content changes.
update public.programs
set version = 'v1.65',
    extension_version = 'v1.65',
    extension_download_url = 'https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-agent';
