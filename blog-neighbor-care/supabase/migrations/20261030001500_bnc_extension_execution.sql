-- Web + extension only. No native host, desktop installer or local credentials.
begin;
set local lock_timeout='5s';set local statement_timeout='30s';
create table public.bnc_extension_permissions (
 device_id uuid primary key references public.bnc_reader_devices(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 kinds text[] not null check(cardinality(kinds) between 1 and 4 and kinds<@array['request','like','comment','reply']::text[]),
 consented_at timestamptz not null default clock_timestamp(),expires_at timestamptz not null,revoked_at timestamptz
);
create table public.bnc_extension_runs (
 id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,
 device_id uuid not null references public.bnc_reader_devices(id) on delete cascade,
 job_id uuid not null references public.bnc_jobs(id) on delete cascade,
 phase text not null check(phase in ('inspect','recheck','effect','done')),
 generation bigint not null default 0,nonce_hash text not null check(nonce_hash ~ '^[a-f0-9]{64}$'),
 profile_hash text not null check(profile_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default clock_timestamp(),valid_until timestamptz not null,expires_at timestamptz not null
);
create unique index bnc_extension_device_run on public.bnc_extension_runs(device_id) where phase<>'done';
create unique index bnc_extension_job_run on public.bnc_extension_runs(job_id) where phase<>'done';
create index bnc_extension_runs_expiry on public.bnc_extension_runs(expires_at);
alter table public.bnc_extension_permissions enable row level security;alter table public.bnc_extension_runs enable row level security;
revoke all on public.bnc_extension_permissions,public.bnc_extension_runs from public,anon,authenticated,service_role;
grant select on public.bnc_extension_permissions,public.bnc_extension_runs to authenticated;
grant select,insert,update,delete on public.bnc_extension_permissions,public.bnc_extension_runs to service_role;
create policy bnc_extension_permission_owner on public.bnc_extension_permissions for select to authenticated using(user_id=(select auth.uid()));
create policy bnc_extension_run_owner on public.bnc_extension_runs for select to authenticated using(user_id=(select auth.uid()) and expires_at>now());

create function public.bnc_extension_permission_dispatch(p_user_id uuid,p_operation text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$ declare d public.bnc_reader_devices; begin
 if p_user_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'BNC_INVALID_INPUT';end if;
 if p_operation='list' and p_payload='{}'::jsonb then
  return (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from(select d.id,d.blog_id,d.expires_at,p.kinds,p.revoked_at,p.expires_at as permission_expires_at
   from public.bnc_reader_devices d left join public.bnc_extension_permissions p on p.device_id=d.id and p.user_id=p_user_id
   where d.user_id=p_user_id and d.revoked_at is null and d.expires_at>clock_timestamp() order by d.created_at desc limit 50)t);
 end if;
 if p_operation not in ('grant','revoke') or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('device_id','confirmed','kinds')) then raise exception 'BNC_INVALID_INPUT';end if;
 select * into d from public.bnc_reader_devices where id=(p_payload->>'device_id')::uuid and user_id=p_user_id and revoked_at is null and expires_at>clock_timestamp() for update;
 if not found then raise exception 'BNC_NOT_FOUND';end if;
 if p_operation='revoke' then update public.bnc_extension_permissions set revoked_at=clock_timestamp() where device_id=d.id and user_id=p_user_id;return jsonb_build_object('revoked',true);end if;
 if p_payload->'confirmed' is distinct from 'true'::jsonb or jsonb_typeof(p_payload->'kinds') is distinct from 'array' then raise exception 'BNC_INVALID_INPUT';end if;
 insert into public.bnc_extension_permissions(device_id,user_id,kinds,expires_at)
 values(d.id,p_user_id,array(select jsonb_array_elements_text(p_payload->'kinds')),d.expires_at)
 on conflict(device_id) do update set kinds=excluded.kinds,consented_at=clock_timestamp(),expires_at=excluded.expires_at,revoked_at=null;
 return jsonb_build_object('authorized',true,'executionSettingsChanged',false);
end $$;
revoke all on function public.bnc_extension_permission_dispatch(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_extension_permission_dispatch(uuid,text,jsonb) to service_role;

create function public.bnc_extension_execute(p_user_id uuid,p_device_id uuid,p_operation text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare d public.bnc_reader_devices;s public.bnc_settings;r public.bnc_extension_runs;j public.bnc_jobs;v jsonb;z jsonb;
 t timestamptz:=clock_timestamp();n integer;m integer;gen bigint;obs timestamptz;attempt timestamptz;relation text;
begin
 if p_operation='cleanup' then
  if p_user_id is not null or p_device_id is not null or p_payload is distinct from '{}'::jsonb then raise exception 'BNC_INVALID_INPUT';end if;
  with doomed as(select id from public.bnc_extension_runs where expires_at<=t order by expires_at,id limit 1000)
  delete from public.bnc_extension_runs expired_run using doomed x where expired_run.id=x.id;
  get diagnostics n=row_count;
  with doomed as(select device_id from public.bnc_extension_permissions where expires_at<=t order by expires_at,device_id limit 1000)
  delete from public.bnc_extension_permissions p using doomed x where p.device_id=x.device_id;
  get diagnostics m=row_count;return jsonb_build_object('expiredExtensionRecordsRemoved',n+m);
 end if;
 if p_user_id is null or p_device_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'BNC_INVALID_INPUT';end if;
 -- Same owner/settings -> job -> run order as the original queue.
 select * into s from public.bnc_settings where user_id=p_user_id for update;
 select * into d from public.bnc_reader_devices where id=p_device_id and user_id=p_user_id and revoked_at is null and expires_at>t;
 if not found or d.account_id is null then raise exception 'BNC_ACCOUNT_REQUIRED';end if;
 if p_operation='status' then
  select * into r from public.bnc_extension_runs where user_id=p_user_id and device_id=d.id and expires_at>t order by created_at desc limit 1;
  if not found then return jsonb_build_object('phase','idle');end if;
  return jsonb_build_object('id',r.id,'phase',r.phase,'jobId',r.job_id,'state',(select state from public.bnc_jobs where id=r.job_id and user_id=p_user_id),'expired',r.valid_until<=t);
 end if;
 if p_operation='offer' then
  if exists(select 1 from public.bnc_extension_runs where device_id=d.id and phase<>'done') then raise exception 'BNC_RUN_REVIEW_REQUIRED';end if;
  select * into j from public.bnc_jobs where user_id=p_user_id and account_id=d.account_id and actor_id=d.blog_id and state='ready' and expires_at>t
   and approval_revision=s.revision and kind in(select jsonb_array_elements_text(p_payload->'kinds'))
   and ((kind='request' and p_payload->>'target_kind'='request' and neighbor_id=p_payload->>'owner')
    or(kind='reply' and p_payload->>'target_kind'='post' and actor_id=p_payload->>'owner' and post_id=p_payload->>'post_id')
    or(kind in ('like','comment') and p_payload->>'target_kind'='post' and neighbor_id=p_payload->>'owner' and post_id=p_payload->>'post_id'))
   order by created_at,id limit 1 for update;
  if not found then return jsonb_build_object('phase','idle');end if;
 else
  select w.* into j from public.bnc_jobs w join public.bnc_extension_runs x on x.job_id=w.id
   where x.id=(p_payload->>'id')::uuid and x.user_id=p_user_id and x.device_id=d.id and w.user_id=p_user_id for update of w;
  if not found then raise exception 'BNC_NOT_FOUND';end if;
  select * into r from public.bnc_extension_runs where id=(p_payload->>'id')::uuid and user_id=p_user_id and device_id=d.id for update;
 end if;
 if p_operation='stop' then
  if r.phase='done' then return jsonb_build_object('phase','done','state',j.state);end if;
  if j.state in ('armed','uncertain') then
   perform public.bnc_execution_result_dispatch(p_user_id,'result',jsonb_build_object('id',j.id,'device_id',d.id,'generation',r.generation,'outcome','uncertain','verified',false));
  elsif j.state='claimed' then perform public.bnc_work_cancel(p_user_id,j.id);end if;
  update public.bnc_extension_runs set phase='done' where id=r.id;
  return jsonb_build_object('phase','done','resultCheckRequired',j.state in ('armed','uncertain'));
 end if;
 if j.kind not in(select jsonb_array_elements_text(p_payload->'kinds')) or not exists(select 1 from public.bnc_runtime where singleton and live_allowed and nullif(btrim(policy_reference),'') is not null)
  or not coalesce(s.enabled,false) or not exists(select 1 from public.bnc_extension_permissions where device_id=d.id and user_id=p_user_id and revoked_at is null and expires_at>t and j.kind=any(kinds))
  or not exists(select 1 from public.member_platform_accounts where id=d.account_id and user_id=p_user_id and platform='naver_blog' and external_id=d.blog_id and not needs_reconnect)
  or j.account_id is distinct from d.account_id or j.actor_id<>d.blog_id or j.expires_at<=t or j.approval_revision<>s.revision
  then raise exception 'BNC_EXTENSION_NOT_READY';end if;
 if p_operation='offer' then
  insert into public.bnc_extension_runs(id,user_id,device_id,job_id,phase,nonce_hash,profile_hash,valid_until,expires_at)
   values((p_payload->>'id')::uuid,p_user_id,d.id,j.id,'inspect',p_payload->>'next_hash',p_payload->>'profile_hash',t+interval '60 seconds',j.expires_at) returning * into r;
  return jsonb_build_object('id',r.id,'phase','inspect','job',to_jsonb(j));
 end if;
 if r.phase='done' or r.valid_until<=t or r.nonce_hash is distinct from p_payload->>'nonce_hash' or r.profile_hash is distinct from p_payload->>'profile_hash' or r.phase<>p_operation then raise exception 'BNC_STALE_RUN';end if;
 if p_operation in ('inspect','recheck') then
  v:=p_payload->'observation';obs:=(v->>'checkedAt')::timestamptz;relation:=v->>'relationship';
  if v->>'accountId' is distinct from j.account_id::text or v->>'actorId' is distinct from j.actor_id or v->>'neighborId' is distinct from j.neighbor_id or v->>'postId' is distinct from j.post_id
   or v->>'restriction' is distinct from 'none' or obs is null or obs>t+interval '1 second' or obs<=t-interval '30 seconds'
   or (j.kind='request' and coalesce(relation,'') not in ('none','removed')) or(j.kind<>'request' and relation is distinct from 'mutual')
   or (j.kind='like' and v->'liked' is distinct from 'false'::jsonb) or(j.kind in ('comment','reply') and v->'duplicate' is distinct from 'false'::jsonb)
   or(j.kind='reply' and (v->>'postOwnerId' is distinct from j.actor_id or v->>'parentAuthorId' is distinct from j.neighbor_id or v->>'parentCommentId' is distinct from j.parent_comment_id)) then raise exception 'BNC_EXTENSION_OBSERVATION';end if;
  perform public.bnc_dispatch(p_user_id,'observe',jsonb_build_object('id',j.id,'relationship',case relation when 'none' then 'unknown' else relation end,'liked',v->'liked'));
  if p_operation='inspect' then
   z:=public.bnc_dispatch(p_user_id,'claim',jsonb_build_object('id',j.id,'device_id',d.id));gen:=(z->>'generation')::bigint;
   update public.bnc_extension_runs set phase='recheck',generation=gen,nonce_hash=p_payload->>'next_hash',valid_until=t+interval '30 seconds' where id=r.id;
   return jsonb_build_object('id',r.id,'phase','recheck');
  end if;
  z:=public.bnc_dispatch(p_user_id,'arm',jsonb_build_object('id',j.id,'device_id',d.id,'generation',r.generation));
  if z->>'state'<>'armed' then raise exception 'BNC_INVALID_STATE';end if;
  z:=public.bnc_dispatch(p_user_id,'verify_permit',jsonb_build_object('id',j.id,'device_id',d.id,'generation',r.generation));
  update public.bnc_extension_runs set phase='effect',nonce_hash=p_payload->>'next_hash',valid_until=(z->>'permit_until')::timestamptz where id=r.id;
  return jsonb_build_object('id',r.id,'phase','apply','permit',jsonb_build_object('generation',r.generation,'deviceId',d.id,'validUntil',z->>'permit_until'));
 end if;
 if p_operation='effect' then
  v:=p_payload->'effect';attempt:=(p_payload->>'attempted_at')::timestamptz;obs:=(v->>'checkedAt')::timestamptz;
  if attempt is null or obs is null or attempt>r.valid_until or attempt<r.created_at or obs<attempt or obs>t+interval '1 second'
   or v->>'accountId' is distinct from j.account_id::text or v->>'actorId' is distinct from j.actor_id or v->>'neighborId' is distinct from j.neighbor_id or v->>'postId' is distinct from j.post_id
   or(j.kind='reply' and (v->>'postOwnerId' is distinct from j.actor_id or v->>'parentAuthorId' is distinct from j.neighbor_id or v->>'parentCommentId' is distinct from j.parent_comment_id)) then raise exception 'BNC_EXTENSION_OBSERVATION';end if;
  z:=jsonb_build_object('account_id',j.account_id,'actor_id',j.actor_id,'neighbor_id',j.neighbor_id,'post_id',j.post_id,'kind',j.kind,'state',v->>'state',
   'effect_id',v->'effectId','body_hash',v->'bodyHash','observed_at',v->>'checkedAt');
  if j.kind='reply' then z:=z||jsonb_build_object('parent_comment_id',j.parent_comment_id);end if;
  z:=public.bnc_execution_result_dispatch(p_user_id,'result',jsonb_build_object('id',j.id,'device_id',d.id,'generation',r.generation,'outcome','success','verified',true,'attempted_at',attempt,'evidence',z));
  update public.bnc_extension_runs set phase='done' where id=r.id;
  return jsonb_build_object('phase','done','state',z->>'state','verificationSource','extension-report');
 end if;
 raise exception 'BNC_INVALID_OPERATION';
end $$;
revoke all on function public.bnc_extension_execute(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_extension_execute(uuid,uuid,text,jsonb) to service_role;
create function public.bnc_extension_execution_cleanup(p_user_id uuid,p_operation text,p_payload jsonb)
returns jsonb language sql security invoker set search_path='' as $$
 select public.bnc_extension_execute(p_user_id,null,p_operation,p_payload);
$$;
revoke all on function public.bnc_extension_execution_cleanup(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_extension_execution_cleanup(uuid,text,jsonb) to service_role;
commit;
