-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.09',
    updated_at = now()
where slug = 'kakao-auto-posting' and version = 'v1.08'
returning slug, version, extension_version, extension_download_url;
