-- 2026-10-12: 주인님 요청으로 제작·등록한 카탈로그 실사 썸네일.
-- Storage 업로드/DB 갱신은 루트 scripts/upload-program-thumbnail.mjs로 적용 완료.
-- 스키마·권한·요금제·프로그램 버전을 변경하지 않는 재현용 DML 기록.
UPDATE public.programs
SET thumbnail_url = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/suno-music-studio-thumbnail.png?v=1791787531229'
WHERE slug = 'suno-music-studio';
