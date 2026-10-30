-- Extension alarms are wakeups only. The existing cursor owns due time/lease.
begin;
set local lock_timeout='5s';set local statement_timeout='30s';
alter table public.bnc_extension_runs add column schedule_preference_revision bigint,
 add column schedule_settings_revision bigint,add column schedule_run_id uuid,add column schedule_generation bigint;
alter function public.bnc_extension_execute(uuid,uuid,text,jsonb) rename to bnc_extension_execute_core;
create function public.bnc_extension_execute(p_user_id uuid,p_device_id uuid,p_operation text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.bnc_settings;p public.bnc_schedule_preferences;c public.bnc_schedule_cursor;
 d public.bnc_reader_devices;r public.bnc_extension_runs;j public.bnc_jobs;v jsonb;tick jsonb;m integer;t timestamptz:=clock_timestamp();
begin
 if p_operation='cleanup' then return public.bnc_extension_execute_core(p_user_id,p_device_id,p_operation,p_payload);end if;
 if p_user_id is null or p_device_id is null then raise exception 'BNC_INVALID_INPUT';end if;
 -- Match the queue's settings -> preferences/cursor -> job -> run lock order.
 select * into s from public.bnc_settings where user_id=p_user_id for update;
 if p_operation='scheduled_offer' then
  select * into d from public.bnc_reader_devices where id=p_device_id and user_id=p_user_id and revoked_at is null and expires_at>t;
  if not found then raise exception 'BNC_ACCOUNT_REQUIRED';end if;
  if not exists(select 1 from public.bnc_extension_permissions where device_id=d.id and user_id=p_user_id and revoked_at is null and expires_at>t and kinds&&array(select jsonb_array_elements_text(p_payload->'kinds')))
   or not exists(select 1 from public.member_platform_accounts where id=d.account_id and user_id=p_user_id and platform='naver_blog' and external_id=d.blog_id and not needs_reconnect)
   or not exists(select 1 from public.bnc_runtime where singleton and live_allowed and nullif(btrim(policy_reference),'') is not null)
   then raise exception 'BNC_EXTENSION_NOT_READY';end if;
  perform public.bnc_schedule_preferences_dispatch(p_user_id,'get','{}');
  select * into p from public.bnc_schedule_preferences where user_id=p_user_id for update;
  select * into c from public.bnc_schedule_cursor where user_id=p_user_id for update;
  if not coalesce(s.enabled,false) then return jsonb_build_object('phase','idle','reason','disabled');end if;
  if c.state='paused' then return jsonb_build_object('phase','idle','reason','result_check_required');end if;
  if c.state='running' then
   tick:=public.bnc_schedule_tick(p_user_id,'begin',jsonb_build_object('job_id',c.job_id,'device_id',d.id,'preference_revision',p.revision,'settings_revision',s.revision));
   return jsonb_build_object('phase','idle','reason',tick->>'reason');
  end if;
  select * into j from public.bnc_jobs where user_id=p_user_id and account_id=d.account_id and actor_id=d.blog_id and state='ready' and expires_at>t and approval_revision=s.revision
   and kind in(select jsonb_array_elements_text(p_payload->'kinds'))
   and ((kind='request' and p_payload->>'target_kind'='request' and neighbor_id=p_payload->>'owner')
    or(kind='reply' and p_payload->>'target_kind'='post' and actor_id=p_payload->>'owner' and post_id=p_payload->>'post_id')
    or(kind in ('like','comment') and p_payload->>'target_kind'='post' and neighbor_id=p_payload->>'owner' and post_id=p_payload->>'post_id')) order by created_at,id limit 1;
  if not found then return jsonb_build_object('phase','idle','reason','no_approved_work','nextDueAt',c.next_due_at);end if;
  if c.user_id is null or c.preference_revision<>p.revision then
   tick:=public.bnc_schedule_tick(p_user_id,'begin',jsonb_build_object('job_id',j.id,'device_id',d.id,'preference_revision',p.revision,'settings_revision',s.revision));
   -- Initialization schedules from now; a running/expired lease never replays.
   return jsonb_build_object('phase','idle','reason',coalesce(tick->>'reason','busy'),'nextDueAt',tick->'next_due_at');
  end if;
  if c.next_due_at>t then return jsonb_build_object('phase','idle','reason','not_due','nextDueAt',c.next_due_at);end if;
  m:=extract(hour from (t at time zone 'Asia/Seoul'))::integer*60+extract(minute from (t at time zone 'Asia/Seoul'))::integer;
  if not(p.start_minute=p.end_minute or(p.start_minute<p.end_minute and m>=p.start_minute and m<p.end_minute) or(p.start_minute>p.end_minute and(m>=p.start_minute or m<p.end_minute))) then return jsonb_build_object('phase','idle','reason','outside_window','nextDueAt',bnc_private.schedule_next(t,p.interval_minutes,p.start_minute,p.end_minute));end if;
  v:=public.bnc_extension_execute_core(p_user_id,p_device_id,'offer',p_payload);
  if v->>'phase'='inspect' then
   update public.bnc_extension_runs set schedule_preference_revision=p.revision,schedule_settings_revision=s.revision where id=(v->>'id')::uuid and user_id=p_user_id;
  end if;
  return v;
 end if;
 if p_operation in ('inspect','reading','recheck','effect','stop') then
  select * into r from public.bnc_extension_runs where id=(p_payload->>'id')::uuid and user_id=p_user_id and device_id=p_device_id;
  if r.schedule_preference_revision is not null and r.phase<>'done' then
   select * into p from public.bnc_schedule_preferences where user_id=p_user_id for update;
   select * into c from public.bnc_schedule_cursor where user_id=p_user_id for update;
   select * into j from public.bnc_jobs where id=r.job_id and user_id=p_user_id for update;
   if p_operation<>'stop' and (p.revision is distinct from r.schedule_preference_revision or s.revision is distinct from r.schedule_settings_revision) then raise exception 'BNC_STALE_REVISION';end if;
   if (p_operation='reading' and r.phase='reading') or (p_operation='inspect' and r.phase='inspect' and j.kind='request') then
    tick:=public.bnc_schedule_tick(p_user_id,'begin',jsonb_build_object('job_id',r.job_id,'device_id',p_device_id,'preference_revision',r.schedule_preference_revision,'settings_revision',r.schedule_settings_revision));
    if tick->'acquired' is distinct from 'true'::jsonb then
     update public.bnc_extension_runs set phase='done' where id=r.id;
     return jsonb_build_object('phase','blocked','reason',tick->>'reason');
    end if;
    update public.bnc_extension_runs set schedule_run_id=(tick->>'run_id')::uuid,schedule_generation=(tick->>'generation')::bigint where id=r.id;
    r.schedule_run_id:=(tick->>'run_id')::uuid;r.schedule_generation:=(tick->>'generation')::bigint;
   end if;
  end if;
 end if;
 v:=public.bnc_extension_execute_core(p_user_id,p_device_id,p_operation,p_payload);
 if r.schedule_run_id is not null and r.phase<>'done' and v->>'phase'='done' then
  tick:=public.bnc_schedule_tick(p_user_id,'finish',jsonb_build_object('run_id',r.schedule_run_id,'generation',r.schedule_generation,'blocked',p_operation='stop'));
  v:=v||jsonb_build_object('scheduleState',tick->>'state','nextDueAt',tick->'next_due_at');
  if tick->>'state'='paused' then v:=v||jsonb_build_object('state','uncertain');end if;
 end if;
 return v;
end $$;
revoke all on function public.bnc_extension_execute(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_extension_execute(uuid,uuid,text,jsonb) to service_role;
-- The internal implementation remains server-only and is never an API proxy.
revoke all on function public.bnc_extension_execute_core(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_extension_execute_core(uuid,uuid,text,jsonb) to service_role;
commit;
