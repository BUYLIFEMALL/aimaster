-- BLOG 크롬 확장(네이버 블로그 입력) 연동 상태 — 2026-10-01 주인님 지시(A안: BLOG 전용 확장).
-- 웹에서 "네이버로 보내기"를 누르면 extension_handoff_at을 기록하고, 확장이 입력 진행 상태를 naver_input_* 칸에 남긴다.
-- naver-blog-seo-studio의 naver_blog_seo_drafts와 같은 칸 구성(확장 코드 재사용).
alter table public.blog_posts
  add column if not exists extension_handoff_at timestamptz,
  add column if not exists naver_input_status text,
  add column if not exists naver_input_completed_at timestamptz,
  add column if not exists naver_input_error text;

alter table public.blog_posts
  drop constraint if exists blog_posts_naver_input_status_check;
alter table public.blog_posts
  add constraint blog_posts_naver_input_status_check
  check (naver_input_status is null or naver_input_status in ('in_progress', 'completed', 'publish_ready', 'failed'));

create index if not exists blog_posts_extension_handoff_idx
  on public.blog_posts (user_id, extension_handoff_at desc)
  where extension_handoff_at is not null;
