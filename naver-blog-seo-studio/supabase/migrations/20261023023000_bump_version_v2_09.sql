-- v2.09 (2026-10-23): 확장 자동 연결 — 확장 「자동 연결」 버튼 또는 웹 설정 「확장 프로그램 바로 연결」 버튼 한 번으로
-- 연결 코드를 자동 발급해 확장에 저장(복사·붙여넣기 없음). 새 화면 /extension-connect. 확장 코드 변경.
update public.programs set version = 'v2.09', extension_version = 'v2.09', updated_at = now() where slug = 'naver-blog-seo-studio';
