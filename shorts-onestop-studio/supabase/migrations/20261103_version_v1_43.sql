-- v1.43 종료 모델 긴급 교체 배포 (2026-11-03, docs/DEPLOY_REQUEST_20261103_RETIRED_MODELS.md)
update public.programs set version = 'v1.43', updated_at = now() where slug = 'shorts-onestop-studio';
