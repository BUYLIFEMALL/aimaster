-- Incoming invitations are separate from outgoing request status. Local only.
begin;
set local lock_timeout='5s';set local statement_timeout='30s';
create table public.bnc_accept_permissions(
 device_id uuid primary key references public.bnc_reader_devices(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,
 read_allowed boolean not null,execute_allowed boolean not null,expires_at timestamptz not null,revoked_at timestamptz
);
create table public.bnc_accept_reads(
 id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,device_id uuid not null references public.bnc_reader_devices(id) on delete cascade,
 account_id uuid not null references public.member_platform_accounts(id) on delete cascade,actor_id text not null,
 phase text not null check(phase in ('read','preview','done','cancelled')),nonce_hash text not null check(nonce_hash~'^[a-f0-9]{64}$'),profile_hash text not null,
 preview_hash text,preview_at timestamptz,created_at timestamptz not null default clock_timestamp(),valid_until timestamptz not null,expires_at timestamptz not null
);
create unique index bnc_accept_read_active on public.bnc_accept_reads(device_id) where phase in ('read','preview');
create table public.bnc_incoming_requests(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.bnc_settings(user_id) on delete cascade,
 account_id uuid not null references public.member_platform_accounts(id) on delete cascade,actor_id text not null,
 request_key text not null check(request_key~'^[a-zA-Z0-9_-]{1,128}$'),neighbor_id text not null check(neighbor_id~'^[a-z0-9_-]{1,50}$' and neighbor_id<>actor_id),
 state text not null default 'pending' check(state in ('pending','accepted')),created_at timestamptz not null,expires_at timestamptz not null,
 unique(user_id,account_id,request_key),check(expires_at=created_at+interval '720 hours')
);
create table public.bnc_accept_jobs(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.bnc_settings(user_id) on delete cascade,
 source_id uuid not null unique references public.bnc_incoming_requests(id) on delete cascade,
 state text not null default 'draft' check(state in ('draft','ready','claimed','armed','succeeded','uncertain','skipped')),
 approval_revision bigint,device_id uuid,nonce_hash text,profile_hash text,valid_until timestamptz,claim_day date,reserved boolean not null default false,
 proof jsonb,created_at timestamptz not null default clock_timestamp(),expires_at timestamptz not null
);
alter table public.bnc_accept_permissions enable row level security;alter table public.bnc_accept_reads enable row level security;
alter table public.bnc_incoming_requests enable row level security;alter table public.bnc_accept_jobs enable row level security;
revoke all on public.bnc_accept_permissions,public.bnc_accept_reads,public.bnc_incoming_requests,public.bnc_accept_jobs from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.bnc_accept_permissions,public.bnc_accept_reads,public.bnc_incoming_requests,public.bnc_accept_jobs to service_role;
create index bnc_incoming_request_owner on public.bnc_incoming_requests(user_id,expires_at);
create index bnc_accept_job_owner on public.bnc_accept_jobs(user_id,state);
create function public.bnc_accept_dispatch(p_user_id uuid,p_device_id uuid,p_operation text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.bnc_settings;d public.bnc_reader_devices;r public.bnc_accept_reads;x public.bnc_incoming_requests;j public.bnc_accept_jobs;
 t timestamptz:=clock_timestamp();v jsonb;item jsonb;h text;observed timestamptz;n integer:=0;m integer:=0;used integer;claim_date date;owner uuid;removed integer;
begin
 if p_operation='cleanup' then
  if p_user_id is not null or p_device_id is not null or p_payload is distinct from '{}'::jsonb then raise exception 'BNC_INVALID_INPUT';end if;
  -- Keep common counters/uncertainty guards; expire only owned payload records.
  for owner in select distinct user_id from (select user_id from public.bnc_accept_reads where expires_at<=t union all select user_id from public.bnc_incoming_requests where expires_at<=t union all select user_id from public.bnc_accept_permissions where expires_at<=t) owners order by user_id limit 100 loop
   perform 1 from public.bnc_settings where user_id=owner for update skip locked;if not found then continue;end if;
   with doomed as(select id from public.bnc_accept_reads where user_id=owner and expires_at<=t order by expires_at,id limit 1000) delete from public.bnc_accept_reads a using doomed b where a.id=b.id;get diagnostics removed=row_count;n:=n+removed;
   with doomed as(select id from public.bnc_incoming_requests where user_id=owner and expires_at<=t order by expires_at,id limit 1000) delete from public.bnc_incoming_requests a using doomed b where a.id=b.id;get diagnostics removed=row_count;n:=n+removed;
   with doomed as(select device_id from public.bnc_accept_permissions where user_id=owner and expires_at<=t order by expires_at,device_id limit 1000) delete from public.bnc_accept_permissions a using doomed b where a.device_id=b.device_id;get diagnostics removed=row_count;n:=n+removed;
  end loop;
  return jsonb_build_object('expiredAcceptRecordsRemoved',n);
 end if;
 if p_user_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'BNC_INVALID_INPUT';end if;
 insert into public.bnc_settings(user_id) values(p_user_id) on conflict do nothing;
 select * into s from public.bnc_settings where user_id=p_user_id for update;
 if p_operation='devices' then
  return (select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select a.id,a.blog_id,p.read_allowed,p.execute_allowed,p.revoked_at,p.expires_at from public.bnc_reader_devices a left join public.bnc_accept_permissions p on p.device_id=a.id and p.user_id=p_user_id where a.user_id=p_user_id and a.revoked_at is null and a.expires_at>t order by a.created_at desc limit 50)q);
 end if;
 if p_operation in ('grant','revoke') then
  select * into d from public.bnc_reader_devices where id=(p_payload->>'device_id')::uuid and user_id=p_user_id and revoked_at is null and expires_at>t;
  if not found then raise exception 'BNC_NOT_FOUND';end if;
  if p_operation='revoke' then update public.bnc_accept_permissions set revoked_at=t where device_id=d.id;return jsonb_build_object('revoked',true);end if;
  if p_payload->'confirmed' is distinct from 'true'::jsonb or jsonb_typeof(p_payload->'read') is distinct from 'boolean' or jsonb_typeof(p_payload->'execute') is distinct from 'boolean' then raise exception 'BNC_INVALID_INPUT';end if;
  insert into public.bnc_accept_permissions(device_id,user_id,read_allowed,execute_allowed,expires_at) values(d.id,p_user_id,(p_payload->>'read')::boolean,(p_payload->>'execute')::boolean,d.expires_at)
   on conflict(device_id) do update set read_allowed=excluded.read_allowed,execute_allowed=excluded.execute_allowed,expires_at=excluded.expires_at,revoked_at=null;
  return jsonb_build_object('saved',true,'executionEnabled',false);
 end if;
 if p_operation='list' then
  return (select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select a.id,a.actor_id,a.request_key,a.neighbor_id,a.state,a.expires_at,w.id as job_id,w.state as job_state from public.bnc_incoming_requests a left join public.bnc_accept_jobs w on w.source_id=a.id and w.user_id=p_user_id where a.user_id=p_user_id and a.expires_at>t order by a.created_at desc limit 50)q);
 end if;
 if p_operation='draft' then
  if p_payload->'confirmed' is distinct from 'true'::jsonb then raise exception 'BNC_INVALID_INPUT';end if;
  select * into x from public.bnc_incoming_requests where id=(p_payload->>'id')::uuid and user_id=p_user_id and state='pending' and expires_at>t+interval '90 seconds';
  if not found then raise exception 'BNC_NOT_FOUND';end if;
  insert into public.bnc_accept_jobs(user_id,source_id,expires_at) values(p_user_id,x.id,x.expires_at) on conflict(source_id) do nothing;
  return (select jsonb_build_object('id',id,'state',state,'externalActions',0) from public.bnc_accept_jobs where source_id=x.id and user_id=p_user_id);
 end if;
 if p_operation='approve' then
  if p_payload->'confirmed' is distinct from 'true'::jsonb then raise exception 'BNC_INVALID_INPUT';end if;
  select * into j from public.bnc_accept_jobs where id=(p_payload->>'id')::uuid and user_id=p_user_id and expires_at>t for update;
  if not found or j.state not in ('draft','skipped') or j.reserved then raise exception 'BNC_INVALID_STATE';end if;
  update public.bnc_accept_jobs set state='ready',approval_revision=s.revision where id=j.id;return jsonb_build_object('id',j.id,'state','ready','externalActions',0);
 end if;
 select * into d from public.bnc_reader_devices where id=p_device_id and user_id=p_user_id and revoked_at is null and expires_at>t;
 if not found or not exists(select 1 from public.member_platform_accounts where id=d.account_id and user_id=p_user_id and platform='naver_blog' and external_id=d.blog_id and not needs_reconnect) then raise exception 'BNC_ACCOUNT_REQUIRED';end if;
 if p_operation='status_read' then return coalesce((select jsonb_build_object('id',id,'phase',phase) from public.bnc_accept_reads where user_id=p_user_id and device_id=d.id and expires_at>t order by created_at desc limit 1),jsonb_build_object('phase','idle'));end if;
 if p_operation in ('offer_read','preview','confirm','cancel') then
  if p_operation='offer_read' then
   if p_payload->>'owner' is distinct from d.blog_id then raise exception 'BNC_ACCOUNT_REQUIRED';end if;
  else
   select * into r from public.bnc_accept_reads where id=(p_payload->>'id')::uuid and user_id=p_user_id and device_id=d.id and account_id=d.account_id and actor_id=d.blog_id for update;
   if not found then raise exception 'BNC_NOT_FOUND';end if;
   if p_operation='cancel' then update public.bnc_accept_reads set phase=case when phase='done' then phase else 'cancelled' end where id=r.id;return jsonb_build_object('phase','cancelled');end if;
  end if;
  if p_payload->'read_enabled' is distinct from 'true'::jsonb or not exists(select 1 from public.bnc_accept_permissions where user_id=p_user_id and device_id=d.id and read_allowed and revoked_at is null and expires_at>t) then raise exception 'BNC_READ_NOT_PERMITTED';end if;
  if p_operation='offer_read' then
   insert into public.bnc_accept_reads(id,user_id,device_id,account_id,actor_id,phase,nonce_hash,profile_hash,valid_until,expires_at) values((p_payload->>'id')::uuid,p_user_id,d.id,d.account_id,d.blog_id,'read',p_payload->>'next_hash',p_payload->>'profile_hash',t+interval '2 minutes',t+interval '720 hours') returning * into r;
   return jsonb_build_object('id',r.id,'phase','read','scope',jsonb_build_object('kind','requests','accountId',d.account_id,'actorId',d.blog_id,'targetOwner',d.blog_id,'postId',''));
  end if;
  if r.valid_until<=t or r.nonce_hash is distinct from p_payload->>'nonce_hash' or r.profile_hash is distinct from p_payload->>'profile_hash' or r.phase is distinct from (case when p_operation='preview' then 'read' else 'preview' end) then raise exception 'BNC_STALE_RUN';end if;
  v:=p_payload->'snapshot';observed:=(v->>'checkedAt')::timestamptz;
  if v->>'accountId' is distinct from d.account_id::text or v->>'actorId' is distinct from d.blog_id or observed is null or observed>t+interval '1 second' or observed<=t-interval '30 seconds' then raise exception 'BNC_READ_CONTEXT';end if;
  if v->>'restriction' in ('login','captcha','platform') then update public.bnc_settings set enabled=false,revision=revision+1 where user_id=p_user_id and enabled;update public.bnc_accept_reads set phase='cancelled' where id=r.id;return jsonb_build_object('blocked',true);end if;
  if v->>'restriction' is distinct from 'none' or v->'complete' is distinct from 'true'::jsonb or jsonb_typeof(v->'count') is distinct from 'number' or jsonb_typeof(v->'requests') is distinct from 'array' or jsonb_array_length(v->'requests')>50 or (v->>'count')::integer<>jsonb_array_length(v->'requests') then raise exception 'BNC_READ_CONTEXT';end if;
  if (select count(distinct z->>'requestId') from jsonb_array_elements(v->'requests')z)<>jsonb_array_length(v->'requests') then raise exception 'BNC_READ_CONTEXT';end if;
  for item in select * from jsonb_array_elements(v->'requests') loop
   if coalesce(item->>'requestId','')!~'^[a-zA-Z0-9_-]{1,128}$' or coalesce(item->>'neighborId','')!~'^[a-z0-9_-]{1,50}$' or item->>'neighborId'=d.blog_id or item->>'state' is distinct from 'pending' then raise exception 'BNC_READ_CONTEXT';end if;
  end loop;
  h:=encode(sha256(convert_to((v-'checkedAt')::text,'UTF8')),'hex');
  if p_operation='preview' then update public.bnc_accept_reads set phase='preview',preview_hash=h,preview_at=observed,nonce_hash=p_payload->>'next_hash' where id=r.id;return jsonb_build_object('phase','preview');end if;
  if h is distinct from r.preview_hash or observed<r.preview_at then raise exception 'BNC_READ_CHANGED';end if;
  for item in select * from jsonb_array_elements(v->'requests') loop
   if exists(select 1 from public.bnc_incoming_requests where user_id=p_user_id and account_id=d.account_id and request_key=item->>'requestId' and neighbor_id<>item->>'neighborId') then raise exception 'BNC_SOURCE_CHANGED';end if;
   insert into public.bnc_incoming_requests(user_id,account_id,actor_id,request_key,neighbor_id,created_at,expires_at) values(p_user_id,d.account_id,d.blog_id,item->>'requestId',item->>'neighborId',r.preview_at,r.preview_at+interval '720 hours') on conflict(user_id,account_id,request_key) do nothing;if found then n:=n+1;end if;
  end loop;
  update public.bnc_accept_reads set phase='done' where id=r.id;return jsonb_build_object('phase','done','savedCount',n,'observedCount',jsonb_array_length(v->'requests'),'coverage','current-page','externalActions',0);
 end if;
 if p_operation='status_work' then
  return coalesce((select jsonb_build_object('id',q.id,'state',q.state) from public.bnc_accept_jobs q join public.bnc_incoming_requests a on a.id=q.source_id where q.user_id=p_user_id and q.device_id=d.id and a.account_id=d.account_id and a.actor_id=d.blog_id and q.expires_at>t and a.expires_at>t order by q.created_at desc limit 1),jsonb_build_object('state','idle'));
 end if;
 if p_operation='offer_check' then
  if p_payload->>'owner' is distinct from d.blog_id or p_payload->'read_enabled' is distinct from 'true'::jsonb or not exists(select 1 from public.bnc_accept_permissions where user_id=p_user_id and device_id=d.id and read_allowed and revoked_at is null and expires_at>t) then raise exception 'BNC_READ_NOT_PERMITTED';end if;
  select q.* into j from public.bnc_accept_jobs q join public.bnc_incoming_requests a on a.id=q.source_id where q.user_id=p_user_id and q.state='uncertain' and q.expires_at>t and a.account_id=d.account_id and a.actor_id=d.blog_id order by q.created_at,q.id limit 1 for update of q;
  if not found then return jsonb_build_object('phase','idle');end if;
  select * into x from public.bnc_incoming_requests where id=j.source_id;
  update public.bnc_accept_jobs set device_id=d.id,nonce_hash=p_payload->>'next_hash',profile_hash=p_payload->>'profile_hash',valid_until=t+interval '30 seconds' where id=j.id;
  return jsonb_build_object('id',j.id,'phase','check','job',jsonb_build_object('id',j.id,'accountId',x.account_id,'actorId',x.actor_id,'neighborId',x.neighbor_id,'requestId',x.request_key,'expiresAt',j.expires_at));
 end if;
 if p_operation='offer_work' then
  if p_payload->>'owner' is distinct from d.blog_id then raise exception 'BNC_ACCOUNT_REQUIRED';end if;
  select q.* into j from public.bnc_accept_jobs q join public.bnc_incoming_requests a on a.id=q.source_id where q.user_id=p_user_id and q.state='ready' and q.expires_at>t and a.account_id=d.account_id and a.actor_id=d.blog_id and a.state='pending' order by q.created_at,q.id limit 1 for update of q;
  if not found then return jsonb_build_object('phase','idle');end if;
 else
  select * into j from public.bnc_accept_jobs where id=(p_payload->>'id')::uuid and user_id=p_user_id and device_id=d.id for update;if not found then raise exception 'BNC_NOT_FOUND';end if;
 end if;
 select * into x from public.bnc_incoming_requests where id=j.source_id and user_id=p_user_id and account_id=d.account_id and actor_id=d.blog_id;
 if not found then raise exception 'BNC_NOT_FOUND';end if;
 if p_operation='stop' then
  if j.state in ('succeeded','uncertain','skipped') then return jsonb_build_object('state',j.state);end if;
  if j.state='armed' then update public.bnc_accept_jobs set state='uncertain' where id=j.id;update public.bnc_settings set enabled=false,revision=revision+1 where user_id=p_user_id and enabled;return jsonb_build_object('state','uncertain');end if;
  if j.reserved then update public.bnc_daily set reserved=reserved-1 where user_id=p_user_id and day=j.claim_day and kind='request' and reserved>0;end if;
  update public.bnc_accept_jobs set state='skipped',reserved=false where id=j.id;return jsonb_build_object('state','skipped');
 end if;
 if p_operation='reconcile' then
  if j.state<>'uncertain' or not j.reserved or j.expires_at<=t or j.valid_until<=t or j.nonce_hash is distinct from p_payload->>'nonce_hash' or j.profile_hash is distinct from p_payload->>'profile_hash' or p_payload->'read_enabled' is distinct from 'true'::jsonb or not exists(select 1 from public.bnc_accept_permissions where user_id=p_user_id and device_id=d.id and read_allowed and revoked_at is null and expires_at>t) then raise exception 'BNC_READ_NOT_PERMITTED';end if;
  v:=p_payload->'snapshot';observed:=(v->>'checkedAt')::timestamptz;
  if v->>'accountId' is distinct from x.account_id::text or v->>'actorId' is distinct from x.actor_id or v->>'neighborId' is distinct from x.neighbor_id or v->>'requestId' is distinct from x.request_key or v->>'restriction' is distinct from 'none' or observed is null or observed>t+interval '1 second' or observed<=t-interval '30 seconds' then raise exception 'BNC_ACCEPT_CONTEXT';end if;
  if v->>'state'='pending' then return jsonb_build_object('state','uncertain','checked',true,'executionEnabled',false);end if;
  if v->>'state' is distinct from 'mutual' then raise exception 'BNC_ACCEPT_CONTEXT';end if;
  update public.bnc_daily set reserved=reserved-1,succeeded=succeeded+1 where user_id=p_user_id and bnc_daily.day=j.claim_day and kind='request' and reserved>0;if not found then raise exception 'BNC_DAILY_CAP';end if;
  update public.bnc_accept_jobs set state='succeeded',reserved=false,proof=v||jsonb_build_object('verificationSource','extension-report','reconciled',true) where id=j.id;
  update public.bnc_incoming_requests set state='accepted' where id=x.id;
  insert into public.bnc_neighbors(user_id,account_id,neighbor_id,state,verified_at) values(p_user_id,x.account_id,x.neighbor_id,'mutual',observed) on conflict(user_id,account_id,neighbor_id) do update set state='mutual',verified_at=excluded.verified_at;
  return jsonb_build_object('state','succeeded','executionEnabled',false,'verificationSource','extension-report');
 end if;
 if p_payload->'execute_enabled' is distinct from 'true'::jsonb or not s.enabled or j.approval_revision is distinct from s.revision or j.expires_at<=t or x.state<>'pending'
  or not exists(select 1 from public.bnc_runtime where singleton and live_allowed and nullif(btrim(policy_reference),'') is not null)
  or not exists(select 1 from public.bnc_accept_permissions where user_id=p_user_id and device_id=d.id and execute_allowed and revoked_at is null and expires_at>t) then raise exception 'BNC_ACCEPT_NOT_READY';end if;
 if p_operation='offer_work' then
  update public.bnc_accept_jobs set device_id=d.id,nonce_hash=p_payload->>'next_hash',profile_hash=p_payload->>'profile_hash',valid_until=t+interval '60 seconds' where id=j.id;
  return jsonb_build_object('id',j.id,'phase','inspect','job',jsonb_build_object('id',j.id,'accountId',x.account_id,'actorId',x.actor_id,'neighborId',x.neighbor_id,'requestId',x.request_key,'expiresAt',j.expires_at));
 end if;
 if j.valid_until<=t or j.nonce_hash is distinct from p_payload->>'nonce_hash' or j.profile_hash is distinct from p_payload->>'profile_hash' then raise exception 'BNC_STALE_RUN';end if;
 v:=p_payload->'snapshot';observed:=(v->>'checkedAt')::timestamptz;
 if v->>'accountId' is distinct from d.account_id::text or v->>'actorId' is distinct from d.blog_id or v->>'neighborId' is distinct from x.neighbor_id or v->>'requestId' is distinct from x.request_key or observed is null or observed>t+interval '1 second' or observed<=t-interval '30 seconds' then raise exception 'BNC_ACCEPT_CONTEXT';end if;
 if v->>'restriction' in ('login','captcha','platform') then update public.bnc_settings set enabled=false,revision=revision+1 where user_id=p_user_id and enabled;return jsonb_build_object('blocked',true);end if;
 if v->>'restriction' is distinct from 'none' then raise exception 'BNC_ACCEPT_CONTEXT';end if;
 if p_operation in ('inspect','arm') then
  if v->>'state' is distinct from 'pending' or exists(select 1 from public.bnc_jobs where user_id=p_user_id and state in ('claimed','armed','uncertain')) or exists(select 1 from public.bnc_accept_jobs where user_id=p_user_id and id<>j.id and state in ('claimed','armed','uncertain')) then raise exception 'BNC_ACCEPT_CONTEXT';end if;
  if p_operation='inspect' then
   if j.state<>'ready' then raise exception 'BNC_INVALID_STATE';end if;claim_date:=(t at time zone 'Asia/Seoul')::date;
   insert into public.bnc_daily(user_id,day,kind) values(p_user_id,claim_date,'request') on conflict do nothing;
   select reserved+succeeded into used from public.bnc_daily where user_id=p_user_id and bnc_daily.day=claim_date and kind='request' for update;
   if used>=s.request_cap then raise exception 'BNC_DAILY_CAP';end if;
   update public.bnc_daily set reserved=reserved+1 where user_id=p_user_id and bnc_daily.day=claim_date and kind='request';
   update public.bnc_accept_jobs set state='claimed',reserved=true,claim_day=claim_date,nonce_hash=p_payload->>'next_hash',valid_until=t+interval '30 seconds' where id=j.id;return jsonb_build_object('id',j.id,'phase','recheck');
  end if;
  if j.state<>'claimed' or j.claim_day is distinct from (t at time zone 'Asia/Seoul')::date then raise exception 'BNC_INVALID_STATE';end if;
  update public.bnc_accept_jobs set state='armed',nonce_hash=p_payload->>'next_hash',valid_until=t+interval '30 seconds' where id=j.id;return jsonb_build_object('id',j.id,'phase','apply','validUntil',t+interval '30 seconds');
 end if;
 if p_operation='effect' then
  if p_payload->>'attempted_at' is null or j.state<>'armed' or v->>'state' is distinct from 'mutual' or observed<(p_payload->>'attempted_at')::timestamptz or (p_payload->>'attempted_at')::timestamptz>t or (p_payload->>'attempted_at')::timestamptz<j.valid_until-interval '30 seconds' then raise exception 'BNC_ACCEPT_CONTEXT';end if;
  update public.bnc_daily set reserved=reserved-1,succeeded=succeeded+1 where user_id=p_user_id and bnc_daily.day=j.claim_day and kind='request' and reserved>0;if not found then raise exception 'BNC_DAILY_CAP';end if;
  update public.bnc_accept_jobs set state='succeeded',reserved=false,proof=v||jsonb_build_object('verificationSource','extension-report') where id=j.id;
  update public.bnc_incoming_requests set state='accepted' where id=x.id;
  insert into public.bnc_neighbors(user_id,account_id,neighbor_id,state,verified_at) values(p_user_id,x.account_id,x.neighbor_id,'mutual',observed) on conflict(user_id,account_id,neighbor_id) do update set state='mutual',verified_at=excluded.verified_at;
  return jsonb_build_object('state','succeeded','verificationSource','extension-report');
 end if;
 raise exception 'BNC_INVALID_OPERATION';
end $$;
revoke all on function public.bnc_accept_dispatch(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_accept_dispatch(uuid,uuid,text,jsonb) to service_role;
create function public.bnc_accept_cleanup(p_user_id uuid,p_operation text,p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select public.bnc_accept_dispatch(p_user_id,null,p_operation,p_payload);$$;
revoke all on function public.bnc_accept_cleanup(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_accept_cleanup(uuid,text,jsonb) to service_role;
-- Share the owner lock with regular work; one unresolved acceptance blocks it.
alter function public.bnc_extension_execute_core(uuid,uuid,text,jsonb) rename to bnc_extension_execute_base;
create function public.bnc_extension_execute_core(p_user_id uuid,p_device_id uuid,p_operation text,p_payload jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$begin
 if p_operation not in ('status','stop','cleanup') then
  perform 1 from public.bnc_settings where user_id=p_user_id for update;
  if exists(select 1 from public.bnc_accept_jobs where user_id=p_user_id and state in ('claimed','armed','uncertain')) then raise exception 'BNC_UNSETTLED_ACCEPT';end if;
 end if;
 return public.bnc_extension_execute_base(p_user_id,p_device_id,p_operation,p_payload);
end $$;
revoke all on function public.bnc_extension_execute_core(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_extension_execute_core(uuid,uuid,text,jsonb) to service_role;

-- Authoritative guard also covers internal/direct queue claim paths and cached
-- caller plans. The regular queue already takes the same owner settings lock.
create function bnc_private.guard_unsettled_accept() returns trigger language plpgsql security invoker set search_path='' as $$begin
 perform 1 from public.bnc_settings where user_id=new.user_id for update;
 if exists(select 1 from public.bnc_accept_jobs where user_id=new.user_id and state in ('claimed','armed','uncertain')) then raise exception 'BNC_UNSETTLED_ACCEPT';end if;
 return new;
end $$;
revoke all on function bnc_private.guard_unsettled_accept() from public,anon,authenticated;
grant execute on function bnc_private.guard_unsettled_accept() to service_role;
create trigger bnc_work_accept_guard before insert or update of state on public.bnc_jobs for each row when(new.state in ('claimed','armed')) execute function bnc_private.guard_unsettled_accept();
commit;
