-- v1.57 (2026-10-22): 떡상 리메이크 문구 베끼기 방지 — 원문(수집 캡션·받아쓰기)과 연속 6어절 겹침 검사·1회 재요청·남으면 안내(공용 reference-copy-guard, 기준 원스톱 reference.ts). 표 구조 변경 없음.
update public.programs set version='v1.57', updated_at=now() where slug='auto-instagram-posting';
