-- Apply after successful v1.57 production deployment; metadata only, no schema change.
update public.programs
set version = 'v1.57', extension_version = 'v1.57',
  extension_download_url = 'https://ai-auto-blog-one.vercel.app/downloads/ai-auto-blog-extension-latest.zip',
  updated_at = now()
where slug = 'ai-auto-blog';
