-- 2026-10-21 v1.25: 연장 요청 lyrics 칸·공백 정리·V6 defaultParamFlag 제외(연장은 아직 실패 — AGENTS.md). 스키마 변경 없음.
update programs set version = 'v1.25', updated_at = now() where slug = 'music-automation';
