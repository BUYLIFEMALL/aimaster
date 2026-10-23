-- v2.06 (2026-10-23): 확장이 네이버 편집기에 글자를 2~4개씩 묶어 입력(쉬는 간격 그대로, 입력 속도 약 3배). 확장 코드 변경.
update public.programs set version = 'v2.06', extension_version = 'v2.06', updated_at = now() where slug = 'naver-blog-seo-studio';
