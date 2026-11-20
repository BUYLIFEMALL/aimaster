-- 2026-11-20 v1.90: 편집 화면 본문 글자수 표시(933b2755c~1635c8b87), 확장 버전·ZIP 함께(확장 코드 변경 없음)
update public.programs set version = 'v1.90', extension_version = 'v1.90', updated_at = now() where slug = 'ai-auto-blog';
