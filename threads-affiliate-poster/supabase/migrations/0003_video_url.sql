-- Threads 쇼핑제휴 자동화 — 게시글 영상 첨부 지원
-- 기존 video_filename 컬럼은 파일명만 저장하고 실제로 게시에 쓰이지 않던 미완성
-- 스텁이었다. Threads API가 media_type=VIDEO + video_url(공개 URL)을 요구하므로,
-- 이미지처럼 Supabase Storage(post-images 버킷)에 업로드한 뒤 공개 URL을 저장하는
-- video_url 컬럼으로 교체한다.

alter table tap_posts rename column video_filename to video_url;
