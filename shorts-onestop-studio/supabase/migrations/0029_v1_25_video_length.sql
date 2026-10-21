-- v1.25 (2026-10-22): AI 영상 길이 선택(장면 길이에 맞춤·5·8·10초, 모델별 허용 길이) + 「모두 영상으로 만들면 약 $X」 합계. 표 구조 변경 없음 — 버전만
update public.programs set version='v1.25', updated_at=now() where slug='shorts-onestop-studio';
