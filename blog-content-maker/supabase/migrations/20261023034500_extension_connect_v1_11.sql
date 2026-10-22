-- v1.11 (2026-10-23): 확장 자동 연결 — 확장 팝업 「자동 연결」·웹 설정 「확장 프로그램 바로 연결」로 7일 연결 코드를 자동 발급해 확장에 저장
-- (새 웹-확장 연결 통로 extension/web-bridge.js, 새 화면 /extension-connect, 로그인 뒤 원래 화면으로 복귀), 설정 화면에 실제 설치 상태 표시.
-- 기준 구현 naver-blog-seo-studio v2.09~v2.10. 확장 코드 변경.
update public.programs set version = 'v1.11', extension_version = 'v1.11', updated_at = now() where slug = 'blog-content-maker';
