-- 이미지 변환 스튜디오(image-convert-studio) 카탈로그 썸네일 등록
UPDATE public.programs
SET 
  thumbnail_url = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/image-convert-studio-thumbnail.jpg',
  updated_at = NOW()
WHERE slug = 'image-convert-studio';
