-- 2026-11-19 v1.88: 설정 화면 플랫폼별 모델 선택·본문 모델 최신화 묶음 배포, 확장 버전·ZIP 함께
update public.programs set version = 'v1.88', extension_version = 'v1.88', updated_at = now() where slug = 'ai-auto-blog';
