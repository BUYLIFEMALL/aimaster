-- v1.04 인스타 카드뉴스 자동화 리브랜딩 및 피드 캡션 기능 추가
update public.programs
set
  name = '인스타 카드뉴스 자동화',
  version = 'v1.04',
  short_desc = 'AI가 인스타 4:5·1:1 카드뉴스를 기획·디자인하고 피드 캡션과 해시태그까지 완성하는 올인원 스튜디오',
  updated_at = now()
where slug = 'cardnews-studio';
