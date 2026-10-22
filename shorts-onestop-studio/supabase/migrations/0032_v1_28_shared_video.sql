-- v1.28 (2026-10-22): 영상 호출을 공용 기준 코드 ai-video-*(기준 ai-image-studio/lib/video/) 사본으로 전환한 것 배포 + Seedance 1 Lite 이어 붙이기 끔(Shots v1.33에서 E006 재현). 표 구조 변경 없음.
update public.programs set version='v1.28', updated_at=now() where slug='shorts-onestop-studio';
