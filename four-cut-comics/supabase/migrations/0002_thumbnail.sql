-- 2026-10-14 카탈로그 썸네일 등록 (scripts/generate-program-thumbnail.mjs, gemini-3-pro-image-preview, 관리자 본인 키 1회)
-- PLATFORM_PATTERNS §13 실사 16:9·한국인·문구 없음. 실제 반영은 스크립트가 수행했고, 이 파일은 기록용이다.
update programs
set thumbnail_url = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/four-cut-comics-thumbnail.jpg?v=1791977149675',
    updated_at = now()
where slug = 'four-cut-comics';
