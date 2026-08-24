-- 채널 동기화를 다시 해도 목록에 다시 나타나지 않도록, 삭제 대신 "숨기기" 플래그를 둔다.
alter table public.ytreply_videos
  add column is_hidden boolean not null default false;
