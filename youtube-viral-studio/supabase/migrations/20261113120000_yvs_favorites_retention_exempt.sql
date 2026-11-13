-- 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth (부모 세션이 주인님 승인 뒤 적용 — 이 파일 작성 세션은 적용하지 않음)
-- 목적: 보관함(yvs_favorites) 30일 정리·조회에서 profiles.retention_exempt = true 회원(관리자·시험 계정·저장 구독 연장 회원) 제외 (2026-11-13)
--   1) cleanup_yvs_expired_favorites(): 예외 회원 행은 지우지 않음 (pg_cron yvs-favorites-retention-30d 는 그대로 이 함수를 부름)
--   2) 조회 RLS 정책 yvs_favorites_owner_read: 예외 회원 본인은 30일 지난 행도 보임
-- 되돌리기: 20261017025253_yvs_member_favorites.sql 의 함수 본문과 yvs_favorites_owner_read 정책을 다시 만든다.
begin;
create or replace function public.cleanup_yvs_expired_favorites() returns bigint
  language plpgsql security invoker set search_path = '' as $$
declare removed bigint;
begin
  delete from public.yvs_favorites t
    where t.created_at <= now() - interval '30 days'
      and not exists (select 1 from public.profiles p where p.id = t.user_id and p.retention_exempt);
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function public.cleanup_yvs_expired_favorites() from public, anon, authenticated, service_role;

drop policy if exists yvs_favorites_owner_read on public.yvs_favorites;
create policy yvs_favorites_owner_read on public.yvs_favorites for select to authenticated
  using (user_id = (select auth.uid()) and (created_at > now() - interval '30 days'
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.retention_exempt)));
commit;
