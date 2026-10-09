-- Apply only after a successful v1.38 production deployment. No schema change.
update public.programs
set version = 'v1.38', extension_version = 'v1.38',
  extension_download_url = 'https://ai-auto-blog-one.vercel.app/downloads/ai-auto-blog-extension-latest.zip',
  updated_at = now()
where slug = 'ai-auto-blog';
