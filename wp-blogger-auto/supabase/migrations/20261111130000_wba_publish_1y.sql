-- wp-blogger-auto v1.04 — 보관 기본 규칙 「발행 1년 · 생성만 30일」 (2026-11-11 주인님 지시)
-- 근거: docs/HANDOFF_20261111_RETENTION_PUBLISH_1Y.md §3·§4, TOP_RULE §0·§8
-- 결정 1(2026-11-11): 워드프레스 발행 글의 우리 저장소 이미지 사본도 원고·기록과 함께 1년
-- · 실제 발행된 글(두 플랫폼, keep_images): 원고·이미지·발행 기록 모두 image_expires_at(발행일+1년)에 함께 삭제
--   (v1.02의 「30일에 본문만 비우기」는 없앰)
-- · 그 밖(초안·예약 대기·실패·확인 필요·만들기만 함): expires_at(만든 날+30일)에 이미지와 함께 삭제
--   단 예약 시각이 아직 안 온 예약 대기 글은 지우지 않음(안전장치)
-- · 관리자·시험 계정(profiles.retention_exempt)은 삭제 제외
-- 플랜: wp-blogger-auto/docs/PLAN_20261111_PRE_LAUNCH_FIXES.md §9

-- 기존 행 보정: 실제 발행된 글은 플랫폼 상관없이 발행일+1년
update public.wba_posts
   set keep_images = true,
       image_expires_at = coalesce(published_at, updated_at) + interval '1 year'
 where status = 'published'
   and (not keep_images or image_expires_at is null);

create or replace function public.wba_cleanup()
returns table (image_path text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with gone as (
    delete from public.wba_posts p
     where (
             -- 미발행: 만든 날+30일 지남(예약 시각이 아직 안 온 예약 대기 글은 제외)
             (not p.keep_images and p.expires_at is not null and p.expires_at < now()
               and not (p.status = 'scheduled' and p.scheduled_at is not null and p.scheduled_at > now()))
             -- 실제 발행: 발행일+1년 지남
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
