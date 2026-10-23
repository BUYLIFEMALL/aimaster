-- v1.77 (2026-10-20): OpenAI 모델별 요청 규칙을 공용 기준 코드 openai-request-params로(기준), GPT-5·GPT-6 선택 시 「응답이 조금 느릴 수 있음」 안내
update public.programs
set version = 'v1.77',
    extension_version = 'v1.77',
    extension_download_url = 'https://naver-blog-seo-studio.buylife.xyz/downloads/naver-blog-seo-studio-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-seo-studio';
