-- v1.57: 글마다 네이버 카테고리(번호+이름)를 BLOG에서 정해 확장으로 보낸다.
-- 확장이 회원의 실제 네이버 카테고리 목록을 읽어 주고, 선택값({"id":"12","name":"경제 이야기"})을 이 칸에 저장한다.
-- 기존 행은 null(= 카테고리를 지정하지 않음, 네이버 기본 카테고리 사용). RLS·권한 변경 없음(서버 관리자 클라이언트만 사용).
alter table public.blog_posts add column if not exists naver_category jsonb;
