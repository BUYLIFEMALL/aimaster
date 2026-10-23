-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.64',
    extension_version = 'v1.64',
    extension_download_url = 'https://ai-auto-blog-one.vercel.app/downloads/ai-auto-blog-extension-latest.zip',
    updated_at = now()
where slug = 'ai-auto-blog' and version = 'v1.63'
returning slug, version, extension_version, extension_download_url;
