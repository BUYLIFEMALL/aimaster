-- v1.89 (2026-10-23): 확장 자동 연결(사이드패널 「자동 연결」·웹 설정 「확장 프로그램 바로 연결」, 새 화면 /extension-connect)과
-- 설정 화면 설치 상태를 실제 확장 버전으로 표시. 기준 구현 naver-blog-seo-studio v2.09~v2.10. 확장 코드 변경.
update public.programs set version = 'v1.89', extension_version = 'v1.89', updated_at = now() where slug = 'tistory-auto-blog';
