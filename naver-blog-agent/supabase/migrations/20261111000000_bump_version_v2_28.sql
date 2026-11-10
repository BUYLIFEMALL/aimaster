-- 2026-11-11 v2.28: U10 2차 「업무 워크스페이스로 보내기」 배포, 확장 버전·ZIP만 맞춤(확장 코드 변경 없음)
update public.programs set version = 'v2.28', extension_version = 'v2.28', updated_at = now() where slug = 'naver-blog-agent';
