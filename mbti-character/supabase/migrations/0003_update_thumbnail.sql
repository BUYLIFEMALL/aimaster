-- 2026-09-14: 메인페이지/카탈로그 카드에 노출할 썸네일 등록.
-- scripts/generate-program-thumbnail.mjs로 Gemini(나노바나나) 직접 호출 → Supabase
-- Storage(program-images 버킷, catalog/mbti-character-thumbnail.jpg) 업로드 → 아래 값
-- 반영까지 MCP로 즉시 적용했고, 이 파일은 그 기록용이다(docs/PLATFORM_PATTERNS.md §12/§13
-- 패턴 그대로 따름).
update programs
set thumbnail_url = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/mbti-character-thumbnail.jpg?v=1789373468918'
where slug = 'mbti-character';
