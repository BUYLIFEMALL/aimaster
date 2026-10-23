-- v1.78 (2026-10-20): 본문 생성 모델 선택 칸에 모델 성격 표시(⚡ 빠름·⚖️ 균형·💎 고품질), 공용 기준 코드 openAIModelTier
update public.programs
set version = 'v1.78',
    extension_version = 'v1.78',
    extension_download_url = 'https://naver-blog-seo-studio.buylife.xyz/downloads/naver-blog-seo-studio-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-seo-studio';
