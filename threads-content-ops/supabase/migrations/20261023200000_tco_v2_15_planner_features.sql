-- 2026-10-23 v2.15 기획 앱(threads-easy-planner) 기능 합치기: 사진·영상 보고 글쓰기, 요일·시간대 추천 주제. 표 변경 없음(기획 앱은 독립 유지).
update public.programs set version = 'v2.15', updated_at = now() where slug = 'threads-content-ops';
