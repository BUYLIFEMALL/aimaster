-- 2026-11-19 v2.27: 본문 모델 목록 최신화·저장 모델 복원(플랫폼 보존) 묶음 배포, 확장 버전·ZIP 함께
update public.programs set version = 'v2.27', extension_version = 'v2.27', updated_at = now() where slug = 'naver-blog-seo-studio';
