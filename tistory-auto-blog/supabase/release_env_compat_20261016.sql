-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.71',
    extension_version = 'v1.71',
    extension_download_url = 'https://tistory-auto-blog-pearl.vercel.app/downloads/tistory-auto-blog-extension-latest.zip',
    updated_at = now()
where slug = 'tistory-auto-blog' and version = 'v1.70'
returning slug, version, extension_version, extension_download_url;
