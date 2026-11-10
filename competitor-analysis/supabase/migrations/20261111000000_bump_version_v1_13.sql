-- 2026-11-11 v1.13: U10 2차 「업무 워크스페이스로 보내기」 배포, 확장 버전만 맞춤(코드 변경 없음)
update public.programs set version = 'v1.13', extension_version = 'v1.13', updated_at = now() where slug = 'competitor-analysis';
