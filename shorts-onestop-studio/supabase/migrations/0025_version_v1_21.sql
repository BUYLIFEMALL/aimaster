-- v1.21 (2026-10-21): 발행 계획 일정 → ⑥ 예약 공개 자동 채우기, 일괄 제작 「📤 유튜브 예약」(일정 시각 비공개 예약 업로드). 업로드 공용 함수 src/lib/youtube/browserUpload.ts. 구조 변경 없음 — 버전만
update public.programs set version='v1.21', updated_at=now() where slug='shorts-onestop-studio';
