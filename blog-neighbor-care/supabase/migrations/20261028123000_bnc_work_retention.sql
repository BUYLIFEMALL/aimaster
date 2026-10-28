-- Expire social-job text without releasing uncertain external-action guards.
-- Local preparation only; apply with the next approved production batch.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create function public.bnc_work_cleanup(p_user_id uuid,p_operation text,p_payload jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_now timestamptz:=clock_timestamp(); v_owner uuid; j public.bnc_jobs%rowtype;
 v_count integer:=0;
begin
 if p_user_id is not null or p_operation is distinct from 'cleanup' or p_payload is distinct from '{}'::jsonb
 then raise exception 'BNC_INVALID_INPUT'; end if;
 -- Match dispatch's lock order (member settings, then jobs). Skip busy members.
 for v_owner in
  select s.user_id from public.bnc_settings s where exists (
   select 1 from public.bnc_jobs x where x.user_id=s.user_id and x.expires_at<=v_now
    and (x.body<>'' or x.approval_hash is not null or x.approval_revision is not null
     or x.lease_until is not null or x.permit_until is not null or x.like_state is not null
     or x.observed_at is not null or x.state in ('draft','ready','claimed','armed'))
  ) order by s.user_id limit 100 for update of s skip locked
 loop
  for j in select * from public.bnc_jobs x where x.user_id=v_owner and x.expires_at<=v_now
   and (x.body<>'' or x.approval_hash is not null or x.approval_revision is not null
    or x.lease_until is not null or x.permit_until is not null or x.like_state is not null
    or x.observed_at is not null or x.state in ('draft','ready','claimed','armed'))
   order by x.created_at,x.id limit 500 for update
  loop
   -- A claimed action has not received a write permit. An armed action may
   -- already have taken effect: never free its daily reservation/comment slot.
   if j.state='claimed' then perform bnc_private.release_reservation(v_owner,j.id); end if;
   if j.state='armed' then
    update public.bnc_settings set enabled=false,revision=revision+1 where user_id=v_owner;
   end if;
   update public.bnc_jobs set body='',approval_hash=null,approval_revision=null,
    like_state=null,observed_at=null,lease_until=null,permit_until=null,
    state=case when j.state in ('draft','ready','claimed') then 'skipped'
      when j.state='armed' then 'uncertain' else j.state end
    where id=j.id and user_id=v_owner;
   v_count:=v_count+1;
  end loop;
 end loop;
 return jsonb_build_object('expiredPayloadsRemoved',v_count);
end $$;
revoke all on function public.bnc_work_cleanup(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_work_cleanup(uuid,text,jsonb) to service_role;
create index bnc_jobs_expiry on public.bnc_jobs(expires_at,user_id);
commit;
