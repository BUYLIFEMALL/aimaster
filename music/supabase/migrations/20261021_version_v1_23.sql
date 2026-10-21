-- 2026-10-21 v1.23: 타임스탬프 가사(LRC·SRT). 스키마 변경 없음.
update programs set version = 'v1.23', updated_at = now() where slug = 'music-automation';
