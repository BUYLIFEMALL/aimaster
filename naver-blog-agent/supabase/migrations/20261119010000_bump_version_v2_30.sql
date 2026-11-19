-- 2026-11-19 v2.30: Next.js 16.4.6 보안 업데이트(16.4.2 취약점)·저장공간 위젯 한 줄, 확장 버전·ZIP 함께(확장 코드 변경 없음)
update public.programs set version = 'v2.30', extension_version = 'v2.30', updated_at = now() where slug = 'naver-blog-agent';
