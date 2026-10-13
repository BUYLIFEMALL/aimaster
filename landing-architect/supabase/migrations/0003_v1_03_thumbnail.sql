-- v1.02~v1.03 (2026-10-13): 카탈로그 썸네일(§13 실사 16:9) 등록 + 버전 갱신 기록
--  - 썸네일은 scripts/generate-program-thumbnail.mjs로 생성해 `program-images` 버킷 `catalog/landing-architect-thumbnail.jpg`에 업로드, programs.thumbnail_url 반영(스크립트가 직접 갱신)
--  - v1.02: Pro 모델 폴백에서 gemini-2.5-pro 제거 / v1.03: 막힌 LoremFlickr를 Picsum 시드 이미지로 대체
UPDATE public.programs
SET version = 'v1.03',
    thumbnail_url = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/landing-architect-thumbnail.jpg?v=1791888671409',
    updated_at = NOW()
WHERE slug = 'landing-architect';
