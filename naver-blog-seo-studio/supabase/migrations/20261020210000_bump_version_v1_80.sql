-- v1.80 (2026-10-20): 모델 선택 칸에 상대 비용 표시(💰·💰💰·💰💰💰), 공용 기준 코드 openAIModelBadge
update public.programs
set version = 'v1.80',
    extension_version = 'v1.80',
    extension_download_url = 'https://naver-blog-seo-studio.buylife.xyz/downloads/naver-blog-seo-studio-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-seo-studio';
