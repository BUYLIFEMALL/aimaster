-- 2026-10-22 게시한 시각 칸 추가(주인님 승인). 운영 DB esgxyikcnnvmlhygjkth.
-- 이미 게시된 글은 지금의 마지막 수정 시각으로 채운다. 채우는 동안 updated_at 자동 갱신 트리거를 잠깐 꺼서 기존 updated_at 값은 바꾸지 않는다.
begin;
alter table public.insta_posts add column if not exists published_at timestamptz;
alter table public.insta_posts disable trigger insta_posts_set_updated_at;
update public.insta_posts set published_at = updated_at where status = 'published' and published_at is null;
alter table public.insta_posts enable trigger insta_posts_set_updated_at;
commit;
