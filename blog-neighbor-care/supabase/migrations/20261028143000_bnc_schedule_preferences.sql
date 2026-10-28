-- Preferences only: no alarm, queue creation or live-enable capability.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create table public.bnc_schedule_preferences(
 user_id uuid primary key references public.bnc_settings(user_id) on delete cascade,
 interval_minutes integer not null default 60 check(interval_minutes=30 or (interval_minutes between 60 and 1440 and interval_minutes%60=0)),
 start_minute integer not null default 540 check(start_minute between 0 and 1439),
 end_minute integer not null default 1320 check(end_minute between 0 and 1439),
 revision bigint not null default 1 check(revision>0),
 updated_at timestamptz not null default now()
);
alter table public.bnc_schedule_preferences enable row level security;
revoke all on public.bnc_schedule_preferences from public,anon,authenticated,service_role;
grant select on public.bnc_schedule_preferences to authenticated;
grant select,insert,update on public.bnc_schedule_preferences to service_role;
create policy bnc_schedule_owner on public.bnc_schedule_preferences for select to authenticated using((select auth.uid())=user_id);
create function public.bnc_schedule_preferences_dispatch(p_user_id uuid,p_operation text,p_payload jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.bnc_schedule_preferences%rowtype;
begin
 if p_user_id is null or p_operation is null or p_operation not in ('get','save') or jsonb_typeof(p_payload) is distinct from 'object'
 then raise exception 'BNC_INVALID_INPUT'; end if;
 if p_operation='get' and p_payload<>'{}'::jsonb then raise exception 'BNC_INVALID_INPUT'; end if;
 if p_operation='save' and (not(p_payload ?& array['interval_minutes','start_minute','end_minute','expected_revision'])
  or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('interval_minutes','start_minute','end_minute','expected_revision'))
  or jsonb_typeof(p_payload->'interval_minutes') is distinct from 'number'
  or jsonb_typeof(p_payload->'start_minute') is distinct from 'number'
  or jsonb_typeof(p_payload->'end_minute') is distinct from 'number'
  or jsonb_typeof(p_payload->'expected_revision') is distinct from 'number') then raise exception 'BNC_INVALID_INPUT'; end if;
 insert into public.bnc_settings(user_id) values(p_user_id) on conflict do nothing;
 perform 1 from public.bnc_settings where user_id=p_user_id for update;
 insert into public.bnc_schedule_preferences(user_id) values(p_user_id) on conflict do nothing;
 if p_operation='save' then
  if not exists(select 1 from public.bnc_schedule_preferences where user_id=p_user_id and revision=(p_payload->>'expected_revision')::bigint)
  then raise exception 'BNC_SCHEDULE_CHANGED'; end if;
  update public.bnc_schedule_preferences set interval_minutes=(p_payload->>'interval_minutes')::integer,
   start_minute=(p_payload->>'start_minute')::integer,end_minute=(p_payload->>'end_minute')::integer,
   revision=revision+1,updated_at=clock_timestamp() where user_id=p_user_id;
 end if;
 select * into strict p from public.bnc_schedule_preferences where user_id=p_user_id;
 return to_jsonb(p)||jsonb_build_object('executionAvailable',false,'externalActions',0);
end $$;
revoke all on function public.bnc_schedule_preferences_dispatch(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_schedule_preferences_dispatch(uuid,text,jsonb) to service_role;
commit;
