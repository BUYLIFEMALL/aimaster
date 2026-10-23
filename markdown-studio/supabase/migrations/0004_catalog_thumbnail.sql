-- 5단계(2026-10-13): 카탈로그 썸네일 등록 (앱 코드 변경 없음, 버전 v1.03 유지)
--  - 이미지는 운영자 본인 계정의 본인 Gemini 키로 1회 생성해 `program-images` 버킷 `catalog/markdown-studio-thumbnail.png`에 업로드(스크립트: scratch/make_markdown_thumb.mjs, Git 제외)
UPDATE public.programs SET thumbnail_url = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/markdown-studio-thumbnail.png?v=1791863611146', updated_at = NOW() WHERE slug = 'markdown-studio';
