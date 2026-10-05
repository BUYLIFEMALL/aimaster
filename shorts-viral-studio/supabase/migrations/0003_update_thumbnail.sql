-- 카탈로그 썸네일 등록 (2026-10-05). docs/PLATFORM_PATTERNS.md §12·§13 규칙으로 생성:
-- scripts/generate-program-thumbnail.mjs (Gemini 3 Pro Image 직접 호출 → Supabase Storage program-images/catalog/ 업로드 → programs.thumbnail_url 갱신)
-- 로컬 백업: shorts-viral-studio/public/shorts-viral-studio-thumbnail.jpg
update programs
set thumbnail_url = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/shorts-viral-studio-thumbnail.jpg?v=1791178247081'
where slug = 'shorts-viral-studio';
