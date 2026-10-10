-- v1.59: prevent duplicate editor images and align upload/verification filenames.
-- Apply after successful production deployment; existing drafts/images remain intact.
update public.programs
set version = 'v1.59',
    extension_version = 'v1.59',
    extension_download_url = 'https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-agent';
