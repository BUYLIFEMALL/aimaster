-- threads-affiliate-poster의 영상 첨부 패턴(이미지와 상호 배타적)을 카페 초안 편집기에도
-- 이식하며 추가. 네이버 카페 글쓰기 오픈API가 영상 URL을 실제로 렌더링해주는지는 아직
-- 미확인 — 우선 image_url과 동일하게 본문 앞에 URL 한 줄로 붙이는 방식으로 넣어둔다.
alter table ncafe_posts add column video_url text;
