-- 2026-10-15 카탈로그 썸네일 (scripts/generate-program-thumbnail.mjs, gemini-3-pro-image-preview, 관리자 키 1회, §13 실사 16:9·한국인·문구 없음). 반영은 스크립트가 했고 이 파일은 기록용.
update programs set thumbnail_url = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/file-merge-thumbnail.jpg?v=1791992937908', updated_at = now() where slug = 'file-merge';
