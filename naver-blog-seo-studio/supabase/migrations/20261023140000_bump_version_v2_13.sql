-- v2.13 (2026-10-23): 모아 둔 수정 배포 — ① 원고에 생성 모델 이름 기록(seo_report.generatedModel) ② 30일 정리 회원별 기록(usage_logs cleanup_expired). 확장 코드 변경 없음(버전만).
update public.programs set version = 'v2.13', extension_version = 'v2.13', updated_at = now() where slug = 'naver-blog-seo-studio';
