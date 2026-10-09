-- v1.61: extension download address is now the fixed -latest.zip. Program version + Chrome extension version/download (extension rule: docs/EXTENSION_RELEASE_RULES.md).
update public.programs
set version = 'v1.61',
    extension_version = 'v1.61',
    extension_download_url = 'https://naver-blog-seo-studio.vercel.app/downloads/naver-blog-seo-studio-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-seo-studio';
