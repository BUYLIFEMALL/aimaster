-- v1.34 종료 모델 긴급 교체 배포 (2026-11-03, docs/DEPLOY_REQUEST_20261103_RETIRED_MODELS.md)
update public.programs set version = 'v1.34', updated_at = now() where slug = 'playlist-channel-studio';
