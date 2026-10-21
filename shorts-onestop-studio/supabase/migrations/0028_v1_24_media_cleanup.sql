-- v1.24 (2026-10-22): 회원 생성 파일 30일 자동 삭제를 AI 영상 → AI 배경 이미지·내레이션 음성까지 확대(/api/cron/cleanup-media, 매일 03:30 KST).
-- 직접 올린 배경음악(<user_id>/bgm/)과 대본 행은 지우지 않는다. 표·버킷 구조 변경 없음 — 버전만
update public.programs set version='v1.24', updated_at=now() where slug='shorts-onestop-studio';
