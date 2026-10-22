-- v2.10 (2026-10-23): 확장 자동 연결 — 확장 팝업 「자동 연결」·웹 설정 「확장 프로그램 바로 연결」(등록한 블로그 선택, 하나면 자동)로
-- 8자리 연결 번호를 자동 발급해 확장의 기존 연결 처리에 넘김(서버 API 변경 없음, 새 화면 /extension-connect), 설정 화면에 실제 설치 상태 표시.
-- 기준 구현 naver-blog-seo-studio v2.09~v2.10. 확장 코드 변경.
update public.programs set version = 'v2.10', extension_version = 'v2.10', updated_at = now() where slug = 'naver-blog-agent';
