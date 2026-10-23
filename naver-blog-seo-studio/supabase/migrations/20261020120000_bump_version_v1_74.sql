-- v1.74 (2026-10-20): 발행 전 점검·경험 메모·문체/FAQ 옵션 추가, 홈판 스토리·인사이트 엣지 전략 거부 버그 수정
update public.programs
set version = 'v1.74',
    extension_version = 'v1.74',
    extension_download_url = 'https://naver-blog-seo-studio.buylife.xyz/downloads/naver-blog-seo-studio-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-seo-studio';
