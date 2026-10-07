-- v1.59: 콘텐츠 생성에서 만든 글에 이미지·영상(최대 20개 혼합 캐러셀)을 함께 저장한다.
-- media = [{ "url": "...", "type": "IMAGE" | "VIDEO", "size": 123456 }, ...]  (공개 버킷 ai-image-generations 의 회원별 경로 URL)
-- 기존 행은 빈 배열로 시작하며 RLS 정책은 tco_posts 의 기존 owner-only 정책을 그대로 따른다(새 정책 없음).
alter table public.tco_posts add column if not exists media jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tco_posts_media_is_array' and conrelid = 'public.tco_posts'::regclass) then
    alter table public.tco_posts add constraint tco_posts_media_is_array check (jsonb_typeof(media) = 'array');
  end if;
end $$;
