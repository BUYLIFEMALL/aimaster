-- v1.30 (2026-10-22): 레퍼런스 쇼츠 문장 베끼기 방지 — 프롬프트 규칙 + 연속 6어절 겹침 검사(AI 없음) + 겹치면 1회 재요청(덜 겹치는 쪽), 남으면 화면 안내. 표 구조 변경 없음.
update public.programs set version='v1.30', updated_at=now() where slug='shorts-onestop-studio';
