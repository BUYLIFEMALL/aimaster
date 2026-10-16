-- v1.11 (2026-10-16): 스톡 복합어 점수·MP4 자막은 목소리 있는 장면만(선택)·목표 길이 45/60초 실측 보정
update public.programs set version='v1.11', updated_at=now() where slug='shorts-onestop-studio';
