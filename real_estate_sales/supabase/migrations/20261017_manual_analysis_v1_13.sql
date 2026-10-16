-- 2026-10-17 v1.13: 매물 상세 열람 시 자동 유료 분석 제거 → [AI 분석 실행] 버튼으로만
update programs set version = 'v1.13', updated_at = now() where slug = 'real-estate-sales';
