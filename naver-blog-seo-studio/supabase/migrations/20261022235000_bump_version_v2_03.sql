-- v2.03 (2026-10-22): 키워드 넘겨받기 — 로그인 뒤에도 기록 번호 유지, 같은 탭 해시 변경 시 다시 불러오기, 키워드 도구 즐겨찾기 기록은 30일 지나도 받음. 버전·확장 버전 갱신(확장 코드 변경 없음).
update public.programs set version = 'v2.03', extension_version = 'v2.03', updated_at = now() where slug = 'naver-blog-seo-studio';
