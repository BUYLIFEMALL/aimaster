-- 2026-10-21 v1.19: 병합 M1 3단계 Suno로 생성·sunoapi.org V6 최신화. 스키마 변경 없음.
update programs set version = 'v1.19', updated_at = now() where slug = 'music-automation';
