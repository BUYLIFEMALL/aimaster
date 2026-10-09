-- 네이버 발행 공개 범위: 기본은 비공개(실수로 전체공개되는 것을 막는다). 'public'일 때만 전체공개로 발행한다.
alter table public.nba_posts
  add column if not exists publish_visibility text not null default 'private';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'nba_posts_publish_visibility_check') then
    alter table public.nba_posts
      add constraint nba_posts_publish_visibility_check check (publish_visibility in ('private', 'public'));
  end if;
end $$;
