-- 2026-11-19 v1.89: Next.js 16.4.6 보안 업데이트·저장공간 위젯 한 줄(운영 모드만), 확장 버전·ZIP 함께(확장 코드 변경 없음)
update public.programs set version = 'v1.89', extension_version = 'v1.89', updated_at = now() where slug = 'ai-auto-blog';
