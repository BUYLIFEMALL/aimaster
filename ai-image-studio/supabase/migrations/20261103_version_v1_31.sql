-- v1.31 종료 모델 긴급 교체 배포 (2026-11-03, docs/DEPLOY_REQUEST_20261103_RETIRED_MODELS.md)
update public.programs set version = 'v1.31', updated_at = now() where slug = 'ai-image-studio';
