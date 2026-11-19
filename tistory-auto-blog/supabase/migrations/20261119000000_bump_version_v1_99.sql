-- 2026-11-19 v1.99: 본문 모델 목록 최신화·소제목 「##」 잔류 수정 등 묶음 배포, 확장 버전·ZIP 함께
update public.programs set version = 'v1.99', extension_version = 'v1.99', updated_at = now() where slug = 'tistory-auto-blog';
