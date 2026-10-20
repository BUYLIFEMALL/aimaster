-- v1.79 (2026-10-20): 모델 성격 표시에 한 줄 설명(마우스 올리기·누르기), 공용 기준 코드 openAIModelTierHint
update public.programs
set version = 'v1.79',
    extension_version = 'v1.79',
    extension_download_url = 'https://naver-blog-seo-studio.buylife.xyz/downloads/naver-blog-seo-studio-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-seo-studio';
