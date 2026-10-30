-- Read-only metadata protocol. No browser actions, AI, queue claims or budgets.
begin;
set local lock_timeout='5s';set local statement_timeout='30s';
alter table public.bnc_extension_permissions add column reads text[] not null default '{}'
 check(cardinality(reads)<=3 and reads<@array['relationship','incoming','return_post']::text[]);
alter table public.bnc_extension_permissions drop constraint bnc_extension_permissions_kinds_check;
alter table public.bnc_extension_permissions add constraint bnc_extension_permission_scopes
 check(cardinality(kinds)<=4 and kinds<@array['request','like','comment','reply']::text[] and cardinality(kinds)+cardinality(reads)>0);

create table public.bnc_extension_context_reads (
 id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,
 device_id uuid not null references public.bnc_reader_devices(id) on delete cascade,
 account_id uuid not null references public.member_platform_accounts(id) on delete cascade,
 kind text not null check(kind in ('relationship','incoming','return_post')),
 target_owner text not null check(target_owner ~ '^[a-z0-9_-]{1,50}$'),post_id text not null,
 job_id uuid references public.bnc_jobs(id) on delete cascade,
 source_id uuid references public.bnc_engagement_inbox(id) on delete cascade,
 phase text not null default 'read' check(phase in ('read','preview','done','cancelled')),
 nonce_hash text not null check(nonce_hash ~ '^[a-f0-9]{64}$'),profile_hash text not null check(profile_hash ~ '^[a-f0-9]{64}$'),
 preview_hash text,preview_at timestamptz,created_at timestamptz not null default clock_timestamp(),valid_until timestamptz not null,expires_at timestamptz not null,
 check(kind='relationship' or post_id ~ '^[0-9]{1,30}$')
);
create unique index bnc_extension_context_active on public.bnc_extension_context_reads(device_id) where phase in ('read','preview');
create index bnc_extension_context_expiry on public.bnc_extension_context_reads(expires_at);
create table public.bnc_return_visit_posts (
 source_id uuid primary key references public.bnc_engagement_inbox(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null references public.member_platform_accounts(id) on delete cascade,
 neighbor_id text not null check(neighbor_id ~ '^[a-z0-9_-]{1,50}$'),post_id text not null check(post_id ~ '^[0-9]{1,30}$'),
 observed_at timestamptz not null,expires_at timestamptz not null check(expires_at<=observed_at+interval '720 hours')
);
alter table public.bnc_extension_context_reads enable row level security;alter table public.bnc_return_visit_posts enable row level security;
revoke all on public.bnc_extension_context_reads,public.bnc_return_visit_posts from public,anon,authenticated,service_role;
grant select on public.bnc_extension_context_reads,public.bnc_return_visit_posts to authenticated;
grant select,insert,update,delete on public.bnc_extension_context_reads to service_role;
grant select,insert,delete on public.bnc_return_visit_posts to service_role;
create policy bnc_context_read_owner on public.bnc_extension_context_reads for select to authenticated using(user_id=(select auth.uid()) and expires_at>now());
create policy bnc_return_post_owner on public.bnc_return_visit_posts for select to authenticated using(user_id=(select auth.uid()) and expires_at>now());

create function public.bnc_extension_context_dispatch(p_user_id uuid,p_device_id uuid,p_operation text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare d public.bnc_reader_devices;r public.bnc_extension_context_reads;j public.bnc_jobs;x public.bnc_engagement_inbox;
 t timestamptz:=clock_timestamp();s jsonb;item jsonb;h text;observed timestamptz;deadline timestamptz;n integer:=0;m integer:=0;eligible integer:=0;
begin
 if p_operation='cleanup' then
  if p_user_id is not null or p_device_id is not null or p_payload is distinct from '{}'::jsonb then raise exception 'BNC_INVALID_INPUT';end if;
  with doomed as(select id from public.bnc_extension_context_reads where expires_at<=t order by expires_at,id limit 1000)
   delete from public.bnc_extension_context_reads v using doomed z where v.id=z.id;
  get diagnostics n=row_count;
  with doomed as(select source_id from public.bnc_return_visit_posts where expires_at<=t order by expires_at,source_id limit 1000)
   delete from public.bnc_return_visit_posts v using doomed z where v.source_id=z.source_id;
  get diagnostics m=row_count;return jsonb_build_object('expiredContextRecordsRemoved',n+m);
 end if;
 if p_user_id is null or p_device_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'BNC_INVALID_INPUT';end if;
 insert into public.bnc_settings(user_id) values(p_user_id) on conflict do nothing;
 perform 1 from public.bnc_settings where user_id=p_user_id for update;
 select * into d from public.bnc_reader_devices where id=p_device_id and user_id=p_user_id and revoked_at is null and expires_at>t;
 if not found or not exists(select 1 from public.member_platform_accounts where id=d.account_id and user_id=p_user_id and platform='naver_blog' and external_id=d.blog_id and not needs_reconnect) then raise exception 'BNC_ACCOUNT_REQUIRED';end if;
 if p_operation='status' then
  select * into r from public.bnc_extension_context_reads where user_id=p_user_id and device_id=d.id and phase in ('read','preview') order by created_at desc limit 1;
  return case when found then jsonb_build_object('id',r.id,'phase',r.phase,'kind',r.kind,'expired',r.valid_until<=t) else jsonb_build_object('phase','idle') end;
 end if;
 if p_operation='offer' then
  update public.bnc_extension_context_reads set phase='cancelled' where user_id=p_user_id and device_id=d.id and phase in ('read','preview') and valid_until<=t;
  if exists(select 1 from public.bnc_extension_context_reads where device_id=d.id and phase in ('read','preview')) then raise exception 'BNC_READ_REVIEW_REQUIRED';end if;
  if p_payload->>'kind'='relationship' then
   select w.* into j from public.bnc_jobs w join public.bnc_execution_evidence e on e.job_id=w.id and e.generation=w.generation and e.user_id=p_user_id
    where w.user_id=p_user_id and w.account_id=d.account_id and w.actor_id=d.blog_id and w.kind='request' and w.state='succeeded' and w.neighbor_id=p_payload->>'owner'
    and w.expires_at>t and e.expires_at>t and e.proof->>'state'='pending' and e.proof->>'kind'='request'
    and e.proof->>'account_id'=w.account_id::text and e.proof->>'actor_id'=w.actor_id and e.proof->>'neighbor_id'=w.neighbor_id and e.proof->>'post_id'=w.post_id
    and e.attempted_at>=w.created_at and e.observed_at>=e.attempted_at and e.observed_at<=t order by w.created_at desc,w.id limit 1 for update of w;
   if not found then raise exception 'BNC_REQUEST_RECEIPT_REQUIRED';end if;deadline:=least(j.expires_at,t+interval '24 hours');
  elsif p_payload->>'kind'='incoming' then
   if p_payload->>'owner' is distinct from d.blog_id or coalesce(p_payload->>'post_id','') !~ '^[0-9]{1,30}$' then raise exception 'BNC_OWN_POST_REQUIRED';end if;deadline:=t+interval '24 hours';
  elsif p_payload->>'kind'='return_post' then
   if p_payload->>'owner'=d.blog_id or coalesce(p_payload->>'post_id','') !~ '^[0-9]{1,30}$' then raise exception 'BNC_RETURN_POST_REQUIRED';end if;
   select * into x from public.bnc_engagement_inbox i where i.user_id=p_user_id and i.account_id=d.account_id and i.actor_id=d.blog_id and i.neighbor_id=p_payload->>'owner'
    and i.expires_at>t and i.visit_job_id is null and i.return_post_id is null and not exists(select 1 from public.bnc_return_visit_posts q where q.source_id=i.id)
    order by i.observed_at desc,i.id limit 1 for update;
   if not found then raise exception 'BNC_RETURN_SOURCE_REQUIRED';end if;deadline:=least(x.expires_at,t+interval '24 hours');
  else raise exception 'BNC_INVALID_INPUT';end if;
  r.kind:=p_payload->>'kind';
 else
  select * into r from public.bnc_extension_context_reads where id=(p_payload->>'id')::uuid and user_id=p_user_id and device_id=d.id for update;
  if not found then raise exception 'BNC_NOT_FOUND';end if;
 end if;
 if p_operation='cancel' then update public.bnc_extension_context_reads set phase=case when phase='done' then phase else 'cancelled' end where id=r.id;return jsonb_build_object('phase','cancelled','externalActions',0);end if;
 if p_operation<>'offer' and (r.account_id is distinct from d.account_id or (r.kind='incoming' and r.target_owner<>d.blog_id)) then raise exception 'BNC_READ_CONTEXT';end if;
 if not exists(select 1 from public.bnc_extension_permissions where device_id=d.id and user_id=p_user_id and revoked_at is null and expires_at>t and r.kind=any(reads))
  or not(r.kind in(select jsonb_array_elements_text(p_payload->'allowed_reads'))) then raise exception 'BNC_READ_NOT_PERMITTED';end if;
 if p_operation='offer' then
  insert into public.bnc_extension_context_reads(id,user_id,device_id,account_id,kind,target_owner,post_id,job_id,source_id,nonce_hash,profile_hash,valid_until,expires_at)
   values((p_payload->>'id')::uuid,p_user_id,d.id,d.account_id,r.kind,p_payload->>'owner',coalesce(p_payload->>'post_id',''),j.id,x.id,p_payload->>'next_hash',p_payload->>'profile_hash',t+interval '2 minutes',deadline) returning * into r;
  return jsonb_build_object('id',r.id,'phase','read','scope',jsonb_build_object('kind',r.kind,'accountId',d.account_id,'actorId',d.blog_id,'targetOwner',r.target_owner,'postId',r.post_id),
   'source',case when x.id is not null then jsonb_build_object('ownPostId',x.own_post_id,'commentId',x.comment_id,'neighborId',x.neighbor_id) else null end,'externalActions',0);
 end if;
 if r.phase not in ('read','preview') or r.valid_until<=t or r.expires_at<=t or r.nonce_hash is distinct from p_payload->>'nonce_hash' or r.profile_hash is distinct from p_payload->>'profile_hash'
  or (p_operation='preview' and r.phase<>'read') or (p_operation='confirm' and r.phase<>'preview') then raise exception 'BNC_STALE_READ';end if;
 s:=p_payload->'snapshot';observed:=(s->>'checkedAt')::timestamptz;
 if s->>'accountId' is distinct from d.account_id::text or s->>'actorId' is distinct from d.blog_id or observed is null or observed>t or observed<=t-interval '30 seconds' or observed<r.created_at then raise exception 'BNC_READ_CONTEXT';end if;
 if s->>'restriction' is distinct from 'none' then
  perform public.bnc_dispatch(p_user_id,'configure',jsonb_build_object('enabled',false));update public.bnc_extension_context_reads set phase='cancelled' where id=r.id;
  return jsonb_build_object('phase','cancelled','blocked',true,'externalActions',0);
 end if;
 if r.kind='relationship' then
  if s->>'neighborId' is distinct from r.target_owner or coalesce(s->>'relationship','') not in ('pending','mutual','removed') then raise exception 'BNC_RELATIONSHIP_UNKNOWN';end if;
 elsif r.kind='incoming' then
  if s->>'ownPostId' is distinct from r.post_id or s->'complete' is distinct from 'true'::jsonb or jsonb_typeof(s->'comments') is distinct from 'array'
   or jsonb_array_length(s->'comments')>50 or (s->>'count')::integer<>jsonb_array_length(s->'comments') then raise exception 'BNC_COMMENTS_INCOMPLETE';end if;
  if (select count(distinct q->>'commentId') from jsonb_array_elements(s->'comments')q)<>jsonb_array_length(s->'comments') then raise exception 'BNC_SOURCE_CHANGED';end if;
  for item in select * from jsonb_array_elements(s->'comments') loop
   if coalesce(item->>'commentId','') !~ '^[a-zA-Z0-9_-]{1,128}$' or coalesce(item->>'neighborId','') !~ '^[a-z0-9_-]{1,50}$' or item->>'neighborId'=d.blog_id
    or item->'parentIsTopLevel' is distinct from 'true'::jsonb or jsonb_typeof(item->'alreadyReplied') is distinct from 'boolean' then raise exception 'BNC_READ_CONTEXT';end if;
  end loop;
 else
  if s->>'neighborId' is distinct from r.target_owner or s->>'postId' is distinct from r.post_id then raise exception 'BNC_READ_CONTEXT';end if;
 end if;
 h:=encode(sha256(convert_to((s-'checkedAt')::text,'UTF8')),'hex');
 if p_operation='preview' then
  update public.bnc_extension_context_reads set preview_hash=h,preview_at=observed,phase='preview',nonce_hash=p_payload->>'next_hash' where id=r.id;
  return jsonb_build_object('phase','preview','externalActions',0);
 end if;
 if p_operation<>'confirm' or h is distinct from r.preview_hash or observed<r.preview_at then raise exception 'BNC_READ_CHANGED';end if;
 if r.kind='relationship' then
  select * into j from public.bnc_jobs where id=r.job_id and user_id=p_user_id and account_id=d.account_id and actor_id=d.blog_id and kind='request' and state='succeeded' and expires_at>t;
  if not found then raise exception 'BNC_REQUEST_RECEIPT_REQUIRED';end if;
  if not exists(select 1 from public.bnc_execution_evidence e where e.job_id=j.id and e.user_id=p_user_id and e.generation=j.generation and e.expires_at>t
   and e.proof->>'kind'='request' and e.proof->>'state'='pending' and e.proof->>'account_id'=j.account_id::text and e.proof->>'actor_id'=j.actor_id
   and e.proof->>'neighbor_id'=j.neighbor_id and e.proof->>'post_id'=j.post_id) then raise exception 'BNC_REQUEST_RECEIPT_REQUIRED';end if;
  perform public.bnc_dispatch(p_user_id,'observe',jsonb_build_object('id',j.id,'relationship',s->>'relationship','liked',null));n:=1;
 elsif r.kind='incoming' then
  for item in select * from jsonb_array_elements(s->'comments') loop
   if item->'alreadyReplied'='true'::jsonb then continue;end if;
   eligible:=eligible+1;
   if exists(select 1 from public.bnc_engagement_inbox where user_id=p_user_id and account_id=d.account_id and own_post_id=r.post_id and comment_id=item->>'commentId' and neighbor_id<>item->>'neighborId') then raise exception 'BNC_SOURCE_CHANGED';end if;
   insert into public.bnc_engagement_inbox(user_id,account_id,actor_id,neighbor_id,own_post_id,comment_id,observed_at,expires_at)
    values(p_user_id,d.account_id,d.blog_id,item->>'neighborId',r.post_id,item->>'commentId',r.preview_at,r.preview_at+interval '720 hours') on conflict(user_id,account_id,own_post_id,comment_id) do nothing;
   if found then n:=n+1;end if;
  end loop;
 else
  select * into x from public.bnc_engagement_inbox where id=r.source_id and user_id=p_user_id and account_id=d.account_id and actor_id=d.blog_id and neighbor_id=r.target_owner and expires_at>t and visit_job_id is null for update;
  if not found then raise exception 'BNC_RETURN_SOURCE_REQUIRED';end if;
  insert into public.bnc_return_visit_posts(source_id,user_id,account_id,neighbor_id,post_id,observed_at,expires_at) values(x.id,p_user_id,d.account_id,x.neighbor_id,r.post_id,r.preview_at,x.expires_at);n:=1;
 end if;
 update public.bnc_extension_context_reads set phase='done' where id=r.id;
 return jsonb_build_object('phase','done','savedCount',n,'kind',r.kind,'coverage',case r.kind when 'incoming' then 'current-post-complete' else 'current-target' end,'verificationSource','extension-report','externalActions',0)
  ||case when r.kind='incoming' then jsonb_build_object('observedCount',jsonb_array_length(s->'comments'),'eligibleCount',eligible,'existingCount',eligible-n) else '{}'::jsonb end;
end $$;
revoke all on function public.bnc_extension_context_dispatch(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_extension_context_dispatch(uuid,uuid,text,jsonb) to service_role;

create or replace function public.bnc_extension_permission_dispatch(p_user_id uuid,p_operation text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$ declare d public.bnc_reader_devices; begin
 if p_user_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'BNC_INVALID_INPUT';end if;
 if p_operation='list' and p_payload='{}'::jsonb then
  return (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from(select d.id,d.blog_id,d.expires_at,p.kinds,p.reads,p.revoked_at,p.expires_at as permission_expires_at
   from public.bnc_reader_devices d left join public.bnc_extension_permissions p on p.device_id=d.id and p.user_id=p_user_id
   where d.user_id=p_user_id and d.revoked_at is null and d.expires_at>clock_timestamp() order by d.created_at desc limit 50)t);
 end if;
 if p_operation not in ('grant','revoke') or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('device_id','confirmed','kinds','reads')) then raise exception 'BNC_INVALID_INPUT';end if;
 select * into d from public.bnc_reader_devices where id=(p_payload->>'device_id')::uuid and user_id=p_user_id and revoked_at is null and expires_at>clock_timestamp() for update;
 if not found then raise exception 'BNC_NOT_FOUND';end if;
 if p_operation='revoke' then update public.bnc_extension_permissions set revoked_at=clock_timestamp() where device_id=d.id and user_id=p_user_id;return jsonb_build_object('revoked',true);end if;
 if p_payload->'confirmed' is distinct from 'true'::jsonb or jsonb_typeof(p_payload->'kinds') is distinct from 'array' or jsonb_typeof(coalesce(p_payload->'reads','[]'::jsonb)) is distinct from 'array' then raise exception 'BNC_INVALID_INPUT';end if;
 insert into public.bnc_extension_permissions(device_id,user_id,kinds,reads,expires_at)
 values(d.id,p_user_id,array(select jsonb_array_elements_text(p_payload->'kinds')),array(select jsonb_array_elements_text(coalesce(p_payload->'reads','[]'::jsonb))),d.expires_at)
 on conflict(device_id) do update set kinds=excluded.kinds,reads=excluded.reads,consented_at=clock_timestamp(),expires_at=excluded.expires_at,revoked_at=null;
 return jsonb_build_object('authorized',true,'executionSettingsChanged',false);
end $$;
revoke all on function public.bnc_extension_permission_dispatch(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_extension_permission_dispatch(uuid,text,jsonb) to service_role;

create or replace function public.bnc_engagement_dispatch(p_user_id uuid,p_operation text,p_payload jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.bnc_settings; x public.bnc_engagement_inbox; j jsonb; target_post text; v_now timestamptz:=clock_timestamp();
begin
 if p_user_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'BNC_INVALID_INPUT';end if;
 insert into public.bnc_settings(user_id) values(p_user_id) on conflict do nothing;
 perform 1 from public.bnc_settings where user_id=p_user_id for update;
 if p_operation='list' then
  if p_payload<>'{}'::jsonb then raise exception 'BNC_INVALID_INPUT';end if;
  return (select coalesce(jsonb_agg(to_jsonb(z)),'[]') from
   (select i.id,i.neighbor_id,i.own_post_id,i.comment_id,coalesce(i.return_post_id,(select t.post_id from public.bnc_return_visit_posts t where t.source_id=i.id and t.user_id=p_user_id and t.account_id=i.account_id and t.neighbor_id=i.neighbor_id and t.expires_at>v_now)) as return_post_id,i.observed_at,i.expires_at,i.reply_job_id,i.visit_job_id
    from public.bnc_engagement_inbox i where i.user_id=p_user_id and i.expires_at>v_now order by i.observed_at desc,i.id limit 50) z);
 end if;
 if p_operation='review' then
  if exists(select 1 from jsonb_object_keys(p_payload) k where k<>'id') then raise exception 'BNC_INVALID_INPUT';end if;
  select to_jsonb(w) into j from public.bnc_jobs w where w.id=(p_payload->>'id')::uuid and w.user_id=p_user_id and w.expires_at>v_now
   and exists(select 1 from public.bnc_engagement_inbox i where i.user_id=p_user_id and i.expires_at>v_now and w.id in(i.reply_job_id,i.visit_job_id));
  if j is null then raise exception 'BNC_NOT_FOUND';end if;
  return j;
 end if;
 if p_operation not in ('reply','return_visit') or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('id','body'))
  or jsonb_typeof(p_payload->'body') is distinct from 'string' or length(btrim(p_payload->>'body')) not between 1 and 4000
  or p_payload->>'body' ~* '(https?://|www\.)' then raise exception 'BNC_INVALID_INPUT';end if;
 select * into x from public.bnc_engagement_inbox where id=(p_payload->>'id')::uuid and user_id=p_user_id for update;
 if not found then raise exception 'BNC_NOT_FOUND';end if;
 if x.expires_at<=v_now then raise exception 'BNC_EXPIRED';end if;
 if not exists(select 1 from public.member_platform_accounts where id=x.account_id and user_id=p_user_id and platform='naver_blog'
  and external_id=x.actor_id and not needs_reconnect) then raise exception 'BNC_ACCOUNT_REQUIRED';end if;
 if (p_operation='reply' and x.reply_job_id is not null) or (p_operation='return_visit' and x.visit_job_id is not null)
  then raise exception 'BNC_ENGAGEMENT_EXISTS';end if;
 target_post:=coalesce(x.return_post_id,(select t.post_id from public.bnc_return_visit_posts t where t.source_id=x.id and t.user_id=p_user_id and t.account_id=x.account_id and t.neighbor_id=x.neighbor_id and t.expires_at>v_now));
 if p_operation='return_visit' and target_post is null then raise exception 'BNC_RETURN_POST_REQUIRED';end if;
 j:=public.bnc_dispatch(p_user_id,'create',jsonb_build_object('account_id',x.account_id,'neighbor_id',x.neighbor_id,
  'post_id',case p_operation when 'reply' then x.own_post_id else target_post end,
  'kind',case p_operation when 'reply' then 'reply' else 'comment' end,'body',p_payload->>'body'));
 update public.bnc_jobs set parent_comment_id=case p_operation when 'reply' then x.comment_id else null end,
  expires_at=x.expires_at where id=(j->>'id')::uuid and user_id=p_user_id returning to_jsonb(bnc_jobs.*) into j;
 update public.bnc_engagement_inbox set reply_job_id=case p_operation when 'reply' then (j->>'id')::uuid else reply_job_id end,
  visit_job_id=case p_operation when 'return_visit' then (j->>'id')::uuid else visit_job_id end where id=x.id;
 return j;
end $$;
revoke all on function public.bnc_engagement_dispatch(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_engagement_dispatch(uuid,text,jsonb) to service_role;

create function public.bnc_extension_context_cleanup(p_user_id uuid,p_operation text,p_payload jsonb)
returns jsonb language sql security invoker set search_path='' as $$
 select public.bnc_extension_context_dispatch(p_user_id,null,p_operation,p_payload);
$$;
revoke all on function public.bnc_extension_context_cleanup(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_extension_context_cleanup(uuid,text,jsonb) to service_role;
commit;
