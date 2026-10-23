-- 타로점 프로그램 카탈로그 썸네일
-- 2026-09-29 교체: 예전 값 '/images/tarot-thumbnail.png'는 일러스트 + 이미지 안 영문 문구 + 정사각형이라
-- PLATFORM_PATTERNS.md §13(실사·문구 없음·16:9) 위반이어서 파일을 삭제하고, 관리자 Gemini 키로 생성한
-- 실사 썸네일(Storage program-images/catalog)로 바꿨다. 이 SQL을 다시 실행해도 옛 이미지로 되돌아가지 않는다.
UPDATE public.programs
SET thumbnail_url = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/tarot-reading-thumbnail.jpg?v=1790644430596'
WHERE slug = 'tarot-reading';
