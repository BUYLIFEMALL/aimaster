-- AI 웹툰 자동화 v1.02 리브랜딩 및 배포 주소 갱신
UPDATE public.programs
SET
  name = 'AI 웹툰 자동화',
  version = 'v1.02',
  app_url = 'https://ai-webtoon-automation.buylife.xyz',
  short_desc = '시놉시스 기획부터 캐릭터 일관성 시트, 컷별 콘티 생성, 세로 스크롤 완성 원고 렌더링 및 롱스크롤 이어붙이기(JPG)까지 한 곳에서 완성하는 AI 웹툰 제작 자동화 프로그램'
WHERE slug = 'ai-webtoon-studio';
