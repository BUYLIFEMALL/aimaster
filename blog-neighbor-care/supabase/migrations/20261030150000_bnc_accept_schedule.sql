-- Approved incoming invitations share the existing owner schedule cursor.
-- Created with migration new, ordered after the pending post_targets migration.
begin;
set local lock_timeout='5s';set local statement_timeout='30s';
alter table public.bnc_schedule_cursor add column accept_job_id uuid references public.bnc_accept_jobs(id) on delete set null;
alter table public.bnc_accept_jobs add column schedule_run_id uuid,add column schedule_generation bigint,
 add column schedule_preference_revision bigint,add column schedule_settings_revision bigint;

alter function public.bnc_accept_dispatch(uuid,uuid,text,jsonb) rename to bnc_accept_dispatch_base;
create function public.bnc_accept_dispatch(p_user_id uuid,p_device_id uuid,p_operation text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.bnc_settings;p public.bnc_schedule_preferences;c public.bnc_schedule_cursor;d public.bnc_reader_devices;
 j public.bnc_accept_jobs;x public.bnc_incoming_requests;v jsonb;t timestamptz:=clock_timestamp();m integer;result text;next_time timestamptz;
begin
 if p_operation='cleanup' then return public.bnc_accept_dispatch_base(p_user_id,p_device_id,p_operation,p_payload);end if;
 if p_user_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'BNC_INVALID_INPUT';end if;
 perform 1 from public.bnc_settings where user_id=p_user_id for update;
 if p_operation='approve' then
  select * into s from public.bnc_settings where user_id=p_user_id;
  select * into c from public.bnc_schedule_cursor where user_id=p_user_id for update;
  select * into j from public.bnc_accept_jobs where id=(p_payload->>'id')::uuid and user_id=p_user_id and expires_at>t for update;
  if not found or p_payload->'confirmed' is distinct from 'true'::jsonb or j.state not in ('draft','ready','skipped') or j.reserved or (c.accept_job_id=j.id and c.state in ('running','paused')) then raise exception 'BNC_INVALID_STATE';end if;
  update public.bnc_accept_jobs set state='ready',approval_revision=s.revision,schedule_run_id=null,schedule_generation=null,schedule_preference_revision=null,schedule_settings_revision=null where id=j.id;
  return jsonb_build_object('id',j.id,'state','ready','externalActions',0);
 end if;
 if p_operation='status_work' then
  select * into d from public.bnc_reader_devices where id=p_device_id and user_id=p_user_id and revoked_at is null and expires_at>t;
  if not found or not exists(select 1 from public.member_platform_accounts where id=d.account_id and user_id=p_user_id and platform='naver_blog' and external_id=d.blog_id and not needs_reconnect) then raise exception 'BNC_ACCOUNT_REQUIRED';end if;
  select q.* into j from public.bnc_accept_jobs q join public.bnc_incoming_requests a on a.id=q.source_id join public.bnc_schedule_cursor cursor on cursor.user_id=q.user_id and cursor.accept_job_id=q.id where q.user_id=p_user_id and q.device_id=d.id and a.account_id=d.account_id and a.actor_id=d.blog_id and q.expires_at>t and a.expires_at>t and cursor.state in ('running','paused');
  if found then return jsonb_build_object('id',j.id,'state',j.state);end if;
 end if;
 if p_operation='scheduled_offer' then
  select * into s from public.bnc_settings where user_id=p_user_id;
  select * into d from public.bnc_reader_devices where id=p_device_id and user_id=p_user_id and revoked_at is null and expires_at>t;
  if not found or p_payload->>'owner' is distinct from d.blog_id or not exists(select 1 from public.member_platform_accounts where id=d.account_id and user_id=p_user_id and external_id=d.blog_id and platform='naver_blog' and not needs_reconnect) then raise exception 'BNC_ACCOUNT_REQUIRED';end if;
  if p_payload->'execute_enabled' is distinct from 'true'::jsonb or not exists(select 1 from public.bnc_accept_permissions where user_id=p_user_id and device_id=d.id and execute_allowed and revoked_at is null and expires_at>t) then raise exception 'BNC_ACCEPT_NOT_READY';end if;
  if not coalesce(s.enabled,false) or not exists(select 1 from public.bnc_runtime where singleton and live_allowed and nullif(btrim(policy_reference),'') is not null) then return jsonb_build_object('phase','idle','reason','disabled');end if;
  perform public.bnc_schedule_preferences_dispatch(p_user_id,'get','{}');
  select * into p from public.bnc_schedule_preferences where user_id=p_user_id for update;
  select * into c from public.bnc_schedule_cursor where user_id=p_user_id for update;
  if c.state='running' then
   if c.running_until>t then return jsonb_build_object('phase','idle','reason','busy');end if;
   update public.bnc_settings set enabled=false,revision=revision+1 where user_id=p_user_id and enabled;
   update public.bnc_schedule_cursor set state='paused',last_result='uncertain',running_until=null,updated_at=t where user_id=p_user_id;
   return jsonb_build_object('phase','idle','reason','result_check_required');
  end if;
  if c.state='paused' or exists(select 1 from public.bnc_jobs where user_id=p_user_id and state in ('claimed','armed','uncertain')) or exists(select 1 from public.bnc_accept_jobs where user_id=p_user_id and state in ('claimed','armed','uncertain')) then return jsonb_build_object('phase','idle','reason','result_check_required');end if;
  if c.user_id is null or c.preference_revision<>p.revision then
   next_time:=bnc_private.schedule_next(t,p.interval_minutes,p.start_minute,p.end_minute);
   insert into public.bnc_schedule_cursor(user_id,preference_revision,next_due_at) values(p_user_id,p.revision,next_time) on conflict(user_id) do update set preference_revision=p.revision,next_due_at=next_time,updated_at=t;
   return jsonb_build_object('phase','idle','reason','scheduled','nextDueAt',next_time);
  end if;
  if c.next_due_at>t then return jsonb_build_object('phase','idle','reason','not_due','nextDueAt',c.next_due_at);end if;
  m:=extract(hour from(t at time zone 'Asia/Seoul'))::integer*60+extract(minute from(t at time zone 'Asia/Seoul'))::integer;
  if not(p.start_minute=p.end_minute or(p.start_minute<p.end_minute and m>=p.start_minute and m<p.end_minute) or(p.start_minute>p.end_minute and(m>=p.start_minute or m<p.end_minute))) then return jsonb_build_object('phase','idle','reason','outside_window','nextDueAt',bnc_private.schedule_next(t,p.interval_minutes,p.start_minute,p.end_minute));end if;
  -- Pin exactly the job the one-shot path would select; a stale approval blocks
  -- rather than silently skipping a member's earlier choice.
  select q.* into j from public.bnc_accept_jobs q join public.bnc_incoming_requests a on a.id=q.source_id where q.user_id=p_user_id and q.state='ready' and q.expires_at>t and a.account_id=d.account_id and a.actor_id=d.blog_id and a.state='pending' order by q.created_at,q.id limit 1 for update of q;
  if not found then return jsonb_build_object('phase','idle','reason','no_approved_work','nextDueAt',c.next_due_at);end if;
  if j.approval_revision is distinct from s.revision then raise exception 'BNC_STALE_REVISION';end if;
  v:=public.bnc_accept_dispatch_base(p_user_id,p_device_id,'offer_work',p_payload);
  if v->>'phase' is distinct from 'inspect' or v->>'id' is distinct from j.id::text then raise exception 'BNC_TARGET_CHANGED';end if;
  update public.bnc_schedule_cursor set state='running',generation=generation+1,run_id=gen_random_uuid(),job_id=null,accept_job_id=j.id,device_id=d.id,running_until=t+interval '5 minutes',updated_at=t where user_id=p_user_id returning * into c;
  update public.bnc_accept_jobs set schedule_run_id=c.run_id,schedule_generation=c.generation,schedule_preference_revision=p.revision,schedule_settings_revision=s.revision where id=j.id;
  return v;
 end if;
 if p_operation in ('offer_work','inspect','arm','effect','stop','reconcile') then
  select * into p from public.bnc_schedule_preferences where user_id=p_user_id for update;
  select * into c from public.bnc_schedule_cursor where user_id=p_user_id for update;
  if p_operation='offer_work' and c.state in ('running','paused') then raise exception 'BNC_SCHEDULE_BUSY';end if;
  if p_operation<>'offer_work' then select * into j from public.bnc_accept_jobs where id=(p_payload->>'id')::uuid and user_id=p_user_id and device_id=p_device_id for update;end if;
  if j.schedule_run_id is not null and p_operation not in ('stop','reconcile') and c.state is distinct from 'running' then raise exception 'BNC_STALE_RUN';end if;
  if j.schedule_run_id is not null and c.state='running' then
   if c.run_id is distinct from j.schedule_run_id or c.generation is distinct from j.schedule_generation or c.accept_job_id is distinct from j.id then raise exception 'BNC_STALE_RUN';end if;
   select * into s from public.bnc_settings where user_id=p_user_id;
   if p_operation not in ('stop','reconcile') and (c.running_until<=t or p.revision is distinct from j.schedule_preference_revision or s.revision is distinct from j.schedule_settings_revision) then raise exception 'BNC_STALE_REVISION';end if;
  end if;
 end if;
 v:=public.bnc_accept_dispatch_base(p_user_id,p_device_id,p_operation,p_payload);
 if p_operation='offer_work' and v->>'phase'='inspect' then
  update public.bnc_accept_jobs set schedule_run_id=null,schedule_generation=null,schedule_preference_revision=null,schedule_settings_revision=null where id=(v->>'id')::uuid and user_id=p_user_id;
 end if;
 if j.schedule_run_id is not null and c.state='running' and p_operation in ('effect','stop','reconcile') then
  select * into j from public.bnc_accept_jobs where id=j.id and user_id=p_user_id;
  result:=case when j.state='succeeded' then 'succeeded' when j.state='skipped' then 'blocked' else 'uncertain' end;
  if c.running_until<=t then result:='uncertain';end if;
  if result='uncertain' then update public.bnc_settings set enabled=false,revision=revision+1 where user_id=p_user_id and enabled;end if;
  next_time:=bnc_private.schedule_next(t,p.interval_minutes,p.start_minute,p.end_minute);
  update public.bnc_schedule_cursor set state=case when result='uncertain' then 'paused' else 'idle' end,last_result=result,running_until=null,next_due_at=next_time,updated_at=t where user_id=p_user_id;
  v:=v||jsonb_build_object('scheduleState',case when result='uncertain' then 'paused' else 'idle' end,'nextDueAt',next_time);
 end if;
 return v;
end $$;
revoke all on function public.bnc_accept_dispatch(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_accept_dispatch(uuid,uuid,text,jsonb) to service_role;

-- Normal work and accept work use the same cursor, never separate clocks.
alter function public.bnc_schedule_tick(uuid,text,jsonb) rename to bnc_schedule_tick_base;
create function public.bnc_schedule_tick(p_user_id uuid,p_operation text,p_payload jsonb default '{}'::jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.bnc_schedule_cursor;v jsonb;
begin
 perform 1 from public.bnc_settings where user_id=p_user_id for update;
 select * into c from public.bnc_schedule_cursor where user_id=p_user_id for update;
 if p_operation='finish' and c.state='running' and c.accept_job_id is not null then raise exception 'BNC_STALE_RUN';end if;
 v:=public.bnc_schedule_tick_base(p_user_id,p_operation,p_payload);
 if p_operation='begin' and v->'acquired'='true'::jsonb then update public.bnc_schedule_cursor set accept_job_id=null where user_id=p_user_id;end if;
 return v;
end $$;
revoke all on function public.bnc_schedule_tick(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_schedule_tick(uuid,text,jsonb) to service_role;

alter function public.bnc_schedule_control(uuid,text,jsonb) rename to bnc_schedule_control_base;
create function public.bnc_schedule_control(p_user_id uuid,p_operation text,p_payload jsonb default '{}'::jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.bnc_settings;p public.bnc_schedule_preferences;c public.bnc_schedule_cursor;j public.bnc_accept_jobs;can_resume boolean;t timestamptz:=clock_timestamp();
begin
 perform 1 from public.bnc_settings where user_id=p_user_id for update;
 select * into p from public.bnc_schedule_preferences where user_id=p_user_id for update;
 select * into c from public.bnc_schedule_cursor where user_id=p_user_id for update;
 if c.accept_job_id is null then
  if exists(select 1 from public.bnc_accept_jobs where user_id=p_user_id and state in ('claimed','armed','uncertain')) then
   if p_operation='resume' then raise exception 'BNC_RESUME_BLOCKED';end if;
   return public.bnc_schedule_control_base(p_user_id,p_operation,p_payload)||jsonb_build_object('resumable',false);
  end if;
  return public.bnc_schedule_control_base(p_user_id,p_operation,p_payload);
 end if;
 if p_operation is null or p_operation not in ('status','resume') or jsonb_typeof(p_payload) is distinct from 'object' or (p_operation='status' and p_payload<>'{}'::jsonb) then raise exception 'BNC_INVALID_INPUT';end if;
 select * into s from public.bnc_settings where user_id=p_user_id;
 select * into j from public.bnc_accept_jobs where user_id=p_user_id and id=c.accept_job_id for update;
 can_resume:=coalesce(c.state='paused' and not s.enabled and j.state in ('succeeded','skipped') and not exists(select 1 from public.bnc_accept_jobs where user_id=p_user_id and state in ('claimed','armed','uncertain')) and not exists(select 1 from public.bnc_jobs where user_id=p_user_id and state in ('claimed','armed','uncertain')),false);
 if p_operation='resume' then
  if (select count(*) from jsonb_object_keys(p_payload))<>5 or not(p_payload ?& array['run_id','generation','settings_revision','preference_revision','confirmed']) or p_payload->'confirmed' is distinct from 'true'::jsonb then raise exception 'BNC_INVALID_INPUT';end if;
  if c.run_id is distinct from (p_payload->>'run_id')::uuid or c.generation is distinct from (p_payload->>'generation')::bigint or s.revision is distinct from (p_payload->>'settings_revision')::bigint or p.revision is distinct from (p_payload->>'preference_revision')::bigint then raise exception 'BNC_SCHEDULE_CHANGED';end if;
  if not can_resume then raise exception 'BNC_RESUME_BLOCKED';end if;
  update public.bnc_schedule_cursor set state='idle',generation=generation+1,run_id=null,device_id=null,running_until=null,preference_revision=p.revision,next_due_at=bnc_private.schedule_next(t,p.interval_minutes,p.start_minute,p.end_minute),last_result=case when j.state='succeeded' then 'succeeded' else 'blocked' end,updated_at=t where user_id=p_user_id returning * into c;
 end if;
 return jsonb_build_object('state',c.state,'generation',c.generation,'run_id',c.run_id,'job_id',c.accept_job_id,'job_state',j.state,'next_due_at',c.next_due_at,'running_until',c.running_until,'last_result',c.last_result,'settings_revision',s.revision,'preference_revision',p.revision,'executionEnabled',s.enabled,'resumable',can_resume and p_operation='status','resumed',p_operation='resume','externalActions',0);
end $$;
revoke all on function public.bnc_schedule_control(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_schedule_control(uuid,text,jsonb) to service_role;

create function bnc_private.guard_accept_schedule() returns trigger language plpgsql security invoker set search_path='' as $$begin
 perform 1 from public.bnc_settings where user_id=new.user_id for update;
 if exists(select 1 from public.bnc_schedule_cursor where user_id=new.user_id and state='running' and accept_job_id is not null) then raise exception 'BNC_SCHEDULE_BUSY';end if;return new;
end $$;
revoke all on function bnc_private.guard_accept_schedule() from public,anon,authenticated;
grant execute on function bnc_private.guard_accept_schedule() to service_role;
create trigger bnc_work_accept_schedule_guard before insert or update of state on public.bnc_jobs for each row when(new.state in ('claimed','armed')) execute function bnc_private.guard_accept_schedule();
commit;
