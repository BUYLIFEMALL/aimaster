-- Apply after successful v1.60 deployment. Release metadata only.
update public.programs
set version = 'v1.60', extension_version = 'v1.60',
    extension_download_url = 'https://ai-auto-blog-one.vercel.app/downloads/ai-auto-blog-extension-latest.zip',
    updated_at = now()
where slug = 'ai-auto-blog';
