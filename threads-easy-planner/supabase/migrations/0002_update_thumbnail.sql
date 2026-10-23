-- 2026-10-04: Threads AI 기획 자동화 (threads-easy-planner) 카탈로그 썸네일 등록
-- scripts/generate-program-thumbnail.mjs로 Gemini(나노바나나 프로) 직접 호출 →
-- Supabase Storage(program-images 버킷, catalog/threads-easy-planner-thumbnail.jpg) 업로드 →
-- programs.thumbnail_url 갱신 완료 (docs/PLATFORM_PATTERNS.md §13 실사 16:9 규격 준수).

UPDATE public.programs
SET thumbnail_url = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/threads-easy-planner-thumbnail.jpg?v=1791076543712'
WHERE slug = 'threads-easy-planner';
