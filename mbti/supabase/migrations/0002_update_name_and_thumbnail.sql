-- 프로그램명을 "성격코드"에서 "성격코드(MBTI) 측정기"로 변경하고, 카탈로그 썸네일을 등록한다.
-- MCP로 즉시 적용했고(2026-09-14), 이 파일은 그 기록용이다.
--
-- 썸네일은 Cloudinary generate-image(nano-banana 모델)로 생성한 뒤, 플랫폼 표준대로
-- Supabase Storage의 program-images 버킷(catalog/personality-code-thumbnail.jpg)에 업로드하고
-- 그 공개 URL을 저장했다. 이미지 문구는 "ENFP / 활동가"처럼 이 사이트 자체 표기만 쓰고,
-- 16personalities류의 "-A/-T" 표기나 고유 별명("The Campaigner" 등)은 상표 리스크 때문에
-- 배제했다(1차 생성본에서 그런 표기가 나와 즉시 재생성함).
update programs
set
  name = '성격코드(MBTI) 측정기',
  thumbnail_url = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/personality-code-thumbnail.jpg?v=1789360100'
where slug = 'personality-code';
