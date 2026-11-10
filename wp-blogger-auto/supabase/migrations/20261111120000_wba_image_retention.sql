-- wp-blogger-auto v1.02 — 발행 이미지 1년 보관 (2026-11-11 주인님 결정)
-- 「발행된 콘텐츠관련된 이미지와 파일만 보관하고 발행하지 않은 콘텐츠에 대해서 30일보관 규칙을 적용」
-- · 구글 블로그에 실제 발행된 글(keep_images): 본문은 expires_at(30일)에 비우고, 이미지는 image_expires_at(발행일+1년)에 기록과 함께 삭제
-- · 그 밖(초안·예약 대기·실패·확인 필요·워드프레스): expires_at(만든 날+30일)에 이미지와 함께 삭제
-- · 관리자·시험 계정(profiles.retention_exempt)은 삭제 제외
-- 플랜: wp-blogger-auto/docs/PLAN_20261111_PRE_LAUNCH_FIXES.md

alter table public.wba_posts add column if not exists image_expires_at timestamptz;

create index if not exists wba_posts_image_sweep on public.wba_posts (image_expires_at) where image_expires_at is not null;

-- 기존 행 보정: 실제 발행된 구글 블로그 글 → 발행일+1년 / 예약만 된 글 → 보관 표시 해제(실제 발행 확인 뒤 다시 켬)
update public.wba_posts
   set image_expires_at = coalesce(published_at, updated_at) + interval '1 year'
 where keep_images and platform = 'blogger' and status = 'published' and image_expires_at is null;

update public.wba_posts
   set keep_images = false
 where keep_images and status <> 'published';

create or replace function public.wba_cleanup()
returns table (image_path text)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- (가) 실제 발행된 구글 블로그 글: 30일이 지나면 본문만 비우고 이미지·기록은 image_expires_at까지 남김
  update public.wba_posts p
     set html = '', excerpt = null, topic = null, expires_at = null, updated_at = now()
   where p.keep_images
     and p.expires_at is not null and p.expires_at < now()
     and not exists (select 1 from public.profiles pr where pr.id = p.user_id and pr.retention_exempt);

  -- (나) 지울 행: 미발행·워드프레스 30일 만료 / 발행 이미지 1년 만료 → 이미지 경로를 돌려주고 기록 삭제
  return query
  with gone as (
    delete from public.wba_posts p
     where (
             (not p.keep_images and p.expires_at is not null and p.expires_at < now())
          or (p.keep_images and p.image_expires_at is not null and p.image_expires_at < now())
           )
       and not exists (select 1 from public.profiles pr where pr.id = p.user_id and pr.retention_exempt)
    returning p.images
  )
  select (img ->> 'path')::text
    from gone, jsonb_array_elements(gone.images) as img
   where img ? 'path';
end;
$$;

revoke all on function public.wba_cleanup() from public, anon, authenticated;
grant execute on function public.wba_cleanup() to service_role;
