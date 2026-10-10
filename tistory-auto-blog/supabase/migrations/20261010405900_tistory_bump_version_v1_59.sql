-- Apply after successful v1.59 production deployment; metadata only, no schema change.
update public.programs
set version = 'v1.59', extension_version = 'v1.59',
  extension_download_url = 'https://tistory-auto-blog-pearl.vercel.app/downloads/tistory-auto-blog-extension-latest.zip',
  updated_at = now()
where slug = 'tistory-auto-blog';
