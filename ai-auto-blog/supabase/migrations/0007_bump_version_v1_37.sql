-- v1.37: extension download address is now the fixed -latest.zip (same as naver-blog-agent). Program version + Chrome extension version/download (extension rule: docs/EXTENSION_RELEASE_RULES.md).
update public.programs
set version = 'v1.37',
    extension_version = 'v1.37',
    extension_download_url = 'https://ai-auto-blog-one.vercel.app/downloads/ai-auto-blog-extension-latest.zip',
    updated_at = now()
where slug = 'ai-auto-blog';
