-- 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth (부모 세션이 주인님 승인 뒤 적용 — 이 파일 작성 세션은 적용하지 않음)
-- 목적: 30일 보관 정리에서 profiles.retention_exempt = true 회원(관리자·시험 계정·저장 구독 연장 회원) 제외 (2026-11-13)
--   1) pg_cron document-translator-project-retention: 예외 회원의 dt_projects 는 지우지 않음(dt_operations 24시간 정리는 실행 기록이라 그대로)
--   2) 조회 RLS 정책: 예외 회원 본인은 만료일이 지난 작업도 보임
--   3) dt_save_project: 예외 회원은 만료일이 지난 작업도 다시 저장 가능(나머지 본문은 20261014082202 원본과 같음)
-- 되돌리기: 20261014094000_document_translator_retention.sql 의 cron.schedule, 20261014082202_document_translator_initial.sql 의
--   dt_projects_owner 정책과 dt_save_project 함수 정의를 다시 실행한다.

select cron.unschedule('document-translator-project-retention')
  where exists (select 1 from cron.job where jobname = 'document-translator-project-retention');
select cron.schedule('document-translator-project-retention','35 * * * *',
  $$delete from public.dt_projects t where t.expires_at<=now()
      and not exists (select 1 from public.profiles p where p.id = t.user_id and p.retention_exempt);
    delete from public.dt_operations where created_at<now()-interval '24 hours'$$);

drop policy if exists dt_projects_owner on public.dt_projects;
create policy dt_projects_owner on public.dt_projects for select to authenticated
  using (auth.uid()=user_id and (expires_at>now()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.retention_exempt)));

create or replace function public.dt_save_project(p_user_id uuid,p_id uuid,p_revision integer,p_title text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare previous public.dt_projects; saved public.dt_projects; exempt boolean;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,31));
  select coalesce((select p.retention_exempt from public.profiles p where p.id=p_user_id),false) into exempt;
  select * into previous from public.dt_projects where id=p_id for update;
  if found then
    if previous.user_id<>p_user_id then raise exception 'owner mismatch' using errcode='42501'; end if;
    if previous.expires_at<=now() and not exempt then raise exception 'expired project' using errcode='P0002'; end if;
    if previous.revision<>p_revision then raise exception 'revision conflict' using errcode='40001'; end if;
    update public.dt_projects set title=p_title,payload=p_payload,revision=revision+1,updated_at=now() where id=p_id and user_id=p_user_id returning * into saved;
  else
    if p_revision<>0 then raise exception 'revision conflict' using errcode='40001'; end if;
    if (select count(*) from public.dt_projects where user_id=p_user_id and expires_at>now())>=100 then raise exception 'project limit' using errcode='54000'; end if;
    insert into public.dt_projects(id,user_id,title,payload) values(p_id,p_user_id,p_title,p_payload) returning * into saved;
  end if;
  return jsonb_build_object('id',saved.id,'revision',saved.revision,'updatedAt',saved.updated_at,'expiresAt',saved.expires_at);
end $$;
revoke all on function public.dt_save_project(uuid,uuid,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.dt_save_project(uuid,uuid,integer,text,jsonb) to service_role;
