-- B5: 한국 시간 현재 월 프롬프트 규칙 반영 버전
update public.programs set version = 'v1.63', extension_version = 'v1.63', extension_download_url = 'https://ai-auto-blog-one.vercel.app/downloads/ai-auto-blog-extension-latest.zip', updated_at = now() where slug = 'ai-auto-blog';
