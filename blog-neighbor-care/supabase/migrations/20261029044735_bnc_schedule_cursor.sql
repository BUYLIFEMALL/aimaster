-- Private durable scheduling checkpoint. No cron, enable switch or job approval.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create table public.bnc_schedule_cursor (
 user_id uuid primary key references public.bnc_settings(user_id) on delete cascade,
 preference_revision bigint not null check(preference_revision>0),
 generation bigint not null default 0 check(generation>=0),
 state text not null default 'idle' check(state in ('idle','running','paused')),
 next_due_at timestamptz not null,
 run_id uuid,
 job_id uuid references public.bnc_jobs(id) on delete set null,
 device_id uuid,
 running_until timestamptz,
 last_result text check(last_result in ('succeeded','blocked','uncertain')),
 updated_at timestamptz not null default now(),
 -- Deleted jobs may clear the FK; finish then pauses rather than blocking deletion.
 check(state<>'running' or (run_id is not null and device_id is not null and running_until is not null))
);
alter table public.bnc_schedule_cursor enable row level security;
revoke all on public.bnc_schedule_cursor from public,anon,authenticated,service_role;
grant select on public.bnc_schedule_cursor to authenticated;
grant select,insert,update on public.bnc_schedule_cursor to service_role;
create policy bnc_schedule_cursor_owner on public.bnc_schedule_cursor for select to authenticated using((select auth.uid())=user_id);

create function bnc_private.schedule_next(p_now timestamptz,p_interval integer,p_start integer,p_end integer)
returns timestamptz language plpgsql immutable security invoker set search_path='' as $$
declare candidate timestamp; minute integer;
begin
 candidate:=(p_now at time zone 'Asia/Seoul')+make_interval(mins=>p_interval);
 minute:=extract(hour from candidate)::integer*60+extract(minute from candidate)::integer;
 if p_start=p_end or (p_start<p_end and minute>=p_start and minute<p_end)
  or (p_start>p_end and (minute>=p_start or minute<p_end)) then return candidate at time zone 'Asia/Seoul'; end if;
 return (date_trunc('day',candidate)+make_interval(mins=>p_start)+
  case when p_start<p_end and minute>=p_end then interval '1 day' else interval '0 day' end) at time zone 'Asia/Seoul';
end $$;
revoke all on function bnc_private.schedule_next(timestamptz,integer,integer,integer) from public,anon,authenticated;
grant execute on function bnc_private.schedule_next(timestamptz,integer,integer,integer) to service_role;

create function public.bnc_schedule_tick(p_user_id uuid,p_operation text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 s public.bnc_settings%rowtype; p public.bnc_schedule_preferences%rowtype;
 c public.bnc_schedule_cursor%rowtype; j public.bnc_jobs%rowtype;
 t timestamptz; m integer; result text; next_time timestamptz;
begin
 if p_user_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'BNC_INVALID_INPUT'; end if;
 -- Same lock order as dispatch, cancellation and preferences. Never lock a job first.
 select * into s from public.bnc_settings where user_id=p_user_id for update;
 if not found then raise exception 'BNC_NOT_FOUND'; end if;
 select * into p from public.bnc_schedule_preferences where user_id=p_user_id for update;
 if not found then raise exception 'BNC_NOT_FOUND'; end if;
 t:=clock_timestamp();
 select * into c from public.bnc_schedule_cursor where user_id=p_user_id for update;
 if p_operation='status' then
  if p_payload<>'{}'::jsonb then raise exception 'BNC_INVALID_INPUT'; end if;
  return coalesce(to_jsonb(c),'{}'::jsonb);
 end if;
 if p_operation not in ('begin','finish') then raise exception 'BNC_INVALID_OPERATION'; end if;
 if p_operation='finish' then
  if (select count(*) from jsonb_object_keys(p_payload))<>3 or not(p_payload ?& array['run_id','generation','blocked'])
   or jsonb_typeof(p_payload->'blocked')<>'boolean' or jsonb_typeof(p_payload->'generation')<>'number'
   or (p_payload->>'generation') !~ '^[1-9][0-9]*$' then raise exception 'BNC_INVALID_INPUT'; end if;
  if c.state is distinct from 'running' or c.run_id is distinct from (p_payload->>'run_id')::uuid
   or c.generation is distinct from (p_payload->>'generation')::bigint then raise exception 'BNC_STALE_RUN'; end if;
  select * into j from public.bnc_jobs where user_id=p_user_id and id=c.job_id for update;
  -- The DB result is authoritative, never a caller-supplied success flag.
  result:=case when j.state='succeeded' then 'succeeded'
   when j.state in ('failed_no_effect','skipped') or (j.state='ready' and (p_payload->>'blocked')::boolean) then 'blocked'
   else 'uncertain' end;
  -- A lost/late worker always pauses even if its final result arrives later.
  if c.running_until<=t then result:='uncertain'; end if;
  if result='uncertain' then
   update public.bnc_settings set enabled=false,revision=revision+1 where user_id=p_user_id and enabled;
  end if;
  next_time:=bnc_private.schedule_next(t,p.interval_minutes,p.start_minute,p.end_minute);
  update public.bnc_schedule_cursor set state=case when result='uncertain' then 'paused' else 'idle' end,
   last_result=result,next_due_at=next_time,running_until=null,updated_at=t where user_id=p_user_id returning * into c;
  return to_jsonb(c);
 end if;
 if (select count(*) from jsonb_object_keys(p_payload))<>4 or not(p_payload ?& array['job_id','device_id','preference_revision','settings_revision'])
  or jsonb_typeof(p_payload->'preference_revision')<>'number' or (p_payload->>'preference_revision') !~ '^[1-9][0-9]*$'
  or jsonb_typeof(p_payload->'settings_revision')<>'number' or (p_payload->>'settings_revision') !~ '^[1-9][0-9]*$'
 then raise exception 'BNC_INVALID_INPUT'; end if;
 if c.state='running' then
  if c.running_until>t then return jsonb_build_object('acquired',false,'reason','busy'); end if;
  update public.bnc_settings set enabled=false,revision=revision+1 where user_id=p_user_id and enabled;
  update public.bnc_schedule_cursor set state='paused',last_result='uncertain',running_until=null,updated_at=t where user_id=p_user_id;
  return jsonb_build_object('acquired',false,'reason','result_check_required');
 end if;
 if c.state='paused' then return jsonb_build_object('acquired',false,'reason','result_check_required'); end if;
 if not s.enabled or not exists(select 1 from public.bnc_runtime where singleton and live_allowed and nullif(btrim(policy_reference),'') is not null)
 then return jsonb_build_object('acquired',false,'reason','disabled'); end if;
 if s.revision<>(p_payload->>'settings_revision')::bigint or p.revision<>(p_payload->>'preference_revision')::bigint then raise exception 'BNC_STALE_REVISION'; end if;
 if c.user_id is null or c.preference_revision<>p.revision then
  next_time:=bnc_private.schedule_next(t,p.interval_minutes,p.start_minute,p.end_minute);
  insert into public.bnc_schedule_cursor(user_id,preference_revision,next_due_at) values(p_user_id,p.revision,next_time)
   on conflict(user_id) do update set preference_revision=p.revision,next_due_at=next_time,updated_at=t;
  return jsonb_build_object('acquired',false,'reason','scheduled','next_due_at',next_time);
 end if;
 if c.next_due_at>t then return jsonb_build_object('acquired',false,'reason','not_due'); end if;
 m:=extract(hour from (t at time zone 'Asia/Seoul'))::integer*60+extract(minute from (t at time zone 'Asia/Seoul'))::integer;
 if not(p.start_minute=p.end_minute or (p.start_minute<p.end_minute and m>=p.start_minute and m<p.end_minute)
  or (p.start_minute>p.end_minute and (m>=p.start_minute or m<p.end_minute)))
 then return jsonb_build_object('acquired',false,'reason','outside_window'); end if;
 if exists(select 1 from public.bnc_jobs where user_id=p_user_id and state in ('claimed','armed','uncertain'))
 then return jsonb_build_object('acquired',false,'reason','unsettled_work'); end if;
 select * into j from public.bnc_jobs where user_id=p_user_id and id=(p_payload->>'job_id')::uuid for update;
 if not found or j.state<>'ready' or j.expires_at<=t or j.approval_hash is null or j.approval_revision is distinct from s.revision
  or j.kind not in ('request','like','comment') then return jsonb_build_object('acquired',false,'reason','job_unavailable'); end if;
 if not exists(select 1 from public.bnc_reader_devices d join public.member_platform_accounts a on a.id=d.account_id
   where d.id=(p_payload->>'device_id')::uuid and d.user_id=p_user_id and d.account_id=j.account_id and d.blog_id=j.actor_id
    and d.revoked_at is null and d.expires_at>t and a.user_id=p_user_id and a.platform='naver_blog'
    and a.external_id=j.actor_id and not a.needs_reconnect)
 then return jsonb_build_object('acquired',false,'reason','device_unavailable'); end if;
 update public.bnc_schedule_cursor set state='running',generation=generation+1,run_id=gen_random_uuid(),
  job_id=j.id,device_id=(p_payload->>'device_id')::uuid,running_until=t+interval '5 minutes',updated_at=t
  where user_id=p_user_id returning * into c;
 return to_jsonb(c)||jsonb_build_object('acquired',true);
end $$;
revoke all on function public.bnc_schedule_tick(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_schedule_tick(uuid,text,jsonb) to service_role;
commit;
