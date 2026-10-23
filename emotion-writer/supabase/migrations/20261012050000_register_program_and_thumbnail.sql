-- 감성 글귀 이미지 전용 16:9 실사 썸네일 등록, [운영 준비 중] 해제 및 카탈로그 최상단(122) 배치
UPDATE public.programs
SET
  name = '감성 글귀 이미지',
  thumbnail_url = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/emotion-writer-thumbnail.jpg?v=1791780846849',
  sort_order = 122,
  badges = '["new", "best"]'::jsonb,
  short_desc = 'AI로 마음을 울리는 감성 글귀와 아름다운 배경 사진을 합성하여 완성도 높은 카드 이미지를 제작하는 스튜디오',
  description = '명언·좋은 글, 건강·행복 기원, 카톡·밴드 공유 문구를 본인 API 키로 생성합니다. 직접 입력한 문구도 사용할 수 있습니다. 나노바나나 배경 생성 또는 Pixabay·Pexels 사진 선택, 9:16·1:1·3:4 비율, 한글 글꼴·색·배치 조절, PNG·JPG 저장을 제공합니다. 모든 AI 호출은 회원 본인의 키로 이루어집니다.',
  app_url = 'https://emotion-writer.buylife.xyz',
  updated_at = NOW()
WHERE slug = 'emotion-writer';
