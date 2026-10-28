-- Member-requested cancellation, with the same owner-first lock as dispatch.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create function public.bnc_work_cancel(p_user_id uuid,p_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.bnc_jobs%rowtype; v_now timestamptz:=clock_timestamp();
begin
 if p_user_id is null or p_id is null then raise exception 'BNC_INVALID_INPUT'; end if;
 perform 1 from public.bnc_settings where user_id=p_user_id for update;
 if not found then raise exception 'BNC_NOT_FOUND'; end if;
 select * into j from public.bnc_jobs where id=p_id and user_id=p_user_id for update;
 if not found then raise exception 'BNC_NOT_FOUND'; end if;
 if j.state in ('draft','ready','claimed') then
  if j.state='claimed' then perform bnc_private.release_reservation(p_user_id,j.id); end if;
  update public.bnc_jobs set state='skipped',approval_hash=null,approval_revision=null,
   lease_until=null,permit_until=null where id=j.id and user_id=p_user_id returning * into j;
 elsif j.state='armed' then
  -- A write permit may already have reached the device. Keep reservations,
  -- action guards and generation/device identity for a late result report.
  update public.bnc_settings set enabled=false,revision=revision+1 where user_id=p_user_id;
  update public.bnc_jobs set state='uncertain',lease_until=null,permit_until=null
   where id=j.id and user_id=p_user_id returning * into j;
 end if;
 return jsonb_build_object('id',j.id,'state',j.state,'cancelled',j.state='skipped',
  'resultCheckRequired',j.state='uncertain','externalActions',0,'checkedAt',v_now);
end $$;
revoke all on function public.bnc_work_cancel(uuid,uuid) from public,anon,authenticated;
grant execute on function public.bnc_work_cancel(uuid,uuid) to service_role;
commit;
