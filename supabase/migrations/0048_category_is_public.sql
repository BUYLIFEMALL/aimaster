-- 카테고리 외부 노출 on/off (2026-10-29 주인님 지시): 「백업」 카테고리는 외부에 노출하지 않기로 한 내부 항목이라 카탈로그·분야별 바로가기에서 숨긴다.
--  - categories.is_public=false 인 카테고리는 홈 분야별 바로가기·프로그램 카탈로그 분야 블록·카테고리 칩·카테고리 상세에서 모두 빠진다(코드에서 .eq('is_public', true)로 필터).
--  - 기본값 true 라 기존 카테고리는 그대로 노출된다. 「백업」만 false 로 둔다.
--  - 관리자 화면·DB에는 그대로 남는다(데이터·소속 프로그램 유지, 외부 노출만 중단).

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.categories.is_public IS 'false면 외부(홈·카탈로그·분야 칩·카테고리 상세)에서 숨긴다. 관리자 화면·데이터는 유지. 현재 「백업」만 false.';

UPDATE public.categories SET is_public = false WHERE name = '백업';
