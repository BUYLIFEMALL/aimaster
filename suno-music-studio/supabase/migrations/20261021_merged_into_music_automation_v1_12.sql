-- 2026-10-21 v1.12: 음악 병합 M1 4단계 — 음악(SUNO)자동화 정밀 기획 스튜디오로 병합, 카탈로그 노출 중지.
update programs set version = 'v1.12', is_active = false, updated_at = now() where slug = 'suno-music-studio';
