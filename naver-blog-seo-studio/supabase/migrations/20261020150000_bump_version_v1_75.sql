-- v1.75 (2026-10-20): GPT-5·GPT-6 계열 생성 400 오류 수정(온도 지정 제외·OpenAI 거부 이유 표시), 여러 단어 키워드 점검, 휴대폰 목록 가로 넘침 수정
update public.programs
set version = 'v1.75',
    extension_version = 'v1.75',
    extension_download_url = 'https://naver-blog-seo-studio.buylife.xyz/downloads/naver-blog-seo-studio-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-seo-studio';
