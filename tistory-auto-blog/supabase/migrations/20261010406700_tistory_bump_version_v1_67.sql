-- Apply after successful v1.67 production deployment; metadata only, no schema change.
update public.programs
set version = 'v1.67', extension_version = 'v1.67',
  extension_download_url = 'https://tistory-auto-blog-pearl.vercel.app/downloads/tistory-auto-blog-extension-latest.zip',
  updated_at = now()
where slug = 'tistory-auto-blog';
