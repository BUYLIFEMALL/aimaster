-- v1.76 (2026-10-20): 대시보드 상태 안내 초기값이 기록 유무와 무관하게 「없습니다」로 보이던 문제 수정(원장 #18)
update public.programs
set version = 'v1.76',
    extension_version = 'v1.76',
    extension_download_url = 'https://naver-blog-seo-studio.buylife.xyz/downloads/naver-blog-seo-studio-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-seo-studio';
