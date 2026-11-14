-- 0073 (2026-11-15, [역할: workspace] claude-win-20261025-workspace, 주인님 「너가 해」)
-- 중앙 정리 함수 member_storage_expired_files에서 업무 워크스페이스 버킷 workspace-files를 뺀다.
-- 이유: 워크스페이스는 주인님 지정 예외(일반 자료 1년·음악/영상 30일)로 자체 정리를 한다. 이 함수가 보관 연장 회원의
-- 워크스페이스 첨부를 먼저 지우면 페이지에 남은 첨부가 깨진다. 용량 계산(member_storage_measure)에는 그대로 잡힌다.
-- 요청 근거: docs/HANDOFF_20261111_STORAGE_WIDGET_ROLLOUT.md 「워크스페이스 버킷 제외 요청」. 바뀐 곳은 cand의 where 한 줄뿐(0068 정의 그대로).
CREATE OR REPLACE FUNCTION public.member_storage_expired_files(max_rows integer DEFAULT 500)
 RETURNS TABLE(bucket_id text, name text, user_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with ext as (
    select p.id, pol.retention_days as gen_days, pol.posted_retention_days as post_days
    from public.profiles p cross join lateral public.member_storage_policy(p.id) pol
    where p.retention_exempt and not p.retention_exempt_manual
      and (pol.retention_days is not null or pol.posted_retention_days is not null)
  ), cand as (
    select o.bucket_id, o.name, e.id as uid, o.created_at,
      case when exists (select 1 from public.member_posted_assets m where m.bucket_id = o.bucket_id and m.object_name = o.name)
             or not exists (select 1 from public.storage_posting_tracked_buckets t where t.bucket_id = o.bucket_id)
           then e.post_days else e.gen_days end as days
    from ext e join storage.objects o on o.name like '%' || e.id::text || '%'
    where o.bucket_id <> 'workspace-files' -- 2026-11-15: 워크스페이스는 자체 정리
  )
  select c.bucket_id, c.name, c.uid from cand c
  where c.days is not null and c.created_at < now() - make_interval(days => c.days)
  limit max_rows;
$function$;
