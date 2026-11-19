-- 0076 (2026-11-19, [역할: workspace] claude-win-20261025-workspace, Master msg_42a884229750 · B2B-20261119-MALL-STORAGE 보완)
-- 상태: 로컬 후보 — 운영 미적용. 운영 적용은 Master 승인·실행.
-- 중앙 정리 함수 member_storage_expired_files에서 쇼핑몰 비공개 서류 버킷 mall-builder-private를 뺀다.
-- 이유: 이 버킷의 경로는 <몰 id>/<회원 id>/business-cert-…·reseller-apply-…·supplier-apply-… 로 회원 id가 이름에 들어 있다
--       (mall-builder/src/lib/business.ts·reseller-apply.ts·supplier-apply.ts). 그 회원이 보관 연장 회원이면 이 함수의 후보가 되고,
--       포스팅 추적 버킷이 아니라 포스팅 보관 기간이 지나면 몰이 보관해야 할 거래 서류가 지워진다.
--       쇼핑몰은 자체 보관 규칙을 따른다(근거: mall-builder/docs/DESIGN_20261119_MALL_STORAGE_CENTRAL_USAGE.md 1-4).
-- 범위: 다른 쇼핑몰 버킷(public·proposals·applied)은 지금 경로에 회원 id가 없어 후보가 되지 않으므로 넣지 않았다(최소 변경).
--       용량 계산(member_storage_measure)·권한·workspace-files 제외·다른 버킷의 동작은 그대로다.
-- 바뀐 곳은 cand의 where 한 줄뿐(0073 정의 그대로). 되돌리기: 0073 파일의 함수 정의를 다시 실행.
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
      and o.bucket_id <> 'mall-builder-private' -- 2026-11-19: 쇼핑몰 거래 서류는 몰 자체 보관
  )
  select c.bucket_id, c.name, c.uid from cand c
  where c.days is not null and c.created_at < now() - make_interval(days => c.days)
  limit max_rows;
$function$;
