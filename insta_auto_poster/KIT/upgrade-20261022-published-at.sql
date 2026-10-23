-- 2026-10-22 기존 설치자용 업그레이드(INSTA 포스팅 v1.44): 게시한 시각 칸 추가.
-- Supabase 대시보드 → SQL Editor에 붙여 넣고 Run. 다시 실행해도 안전합니다. 기존 데이터는 지우지 않습니다.
-- 이미 게시된 글은 그때의 마지막 수정 시각으로 채웁니다(채우는 동안 수정 시각 자동 갱신을 잠깐 끕니다).
begin;
alter table public.insta_posts add column if not exists published_at timestamptz;
alter table public.insta_posts disable trigger insta_posts_set_updated_at;
update public.insta_posts set published_at = updated_at where status = 'published' and published_at is null;
alter table public.insta_posts enable trigger insta_posts_set_updated_at;
commit;
