-- v2.04 (2026-10-22): 키워드 넘겨받기 — 같은 탭에서 번호가 바뀔 때 늦게 도착한 앞 번호 응답을 버림. 버전·확장 버전 갱신(확장 코드 변경 없음).
update public.programs set version = 'v2.04', extension_version = 'v2.04', updated_at = now() where slug = 'naver-blog-seo-studio';
