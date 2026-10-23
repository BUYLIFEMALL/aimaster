-- v1.02 (2026-10-13): 카탈로그 썸네일 등록 + 사이드바 현재 위치 중복 강조 정리
--  - 이미지는 운영자 본인 계정의 본인 Gemini 키로 1회 생성해 `program-images` 버킷 `catalog/ui-canvas-thumbnail.png`에 업로드(스크립트: scratch/make_ui_canvas_thumb.mjs, Git 제외)
UPDATE public.programs
SET version = 'v1.02',
    thumbnail_url = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/ui-canvas-thumbnail.png?v=1791876216511',
    updated_at = NOW()
WHERE slug = 'ui-canvas';

-- 2026-10-13 정정: 위 썸네일은 일러스트 스타일이라 카탈로그 실사 규칙(PLATFORM_PATTERNS §13) 위반이었음.
--  `scripts/generate-program-thumbnail.mjs`(규칙 템플릿)로 실사 이미지를 다시 만들어 `catalog/ui-canvas-thumbnail.jpg`로 교체했고
--  programs.thumbnail_url을 갱신했다(옛 PNG는 Storage에서 삭제).
