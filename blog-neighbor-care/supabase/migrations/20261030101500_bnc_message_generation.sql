-- AI text is completed on the web; adoption creates an unapproved draft only.
begin;
set local lock_timeout='5s';set local statement_timeout='30s';
create table public.bnc_message_jobs (
 id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('request','comment','reply')),
 account_id uuid references public.member_platform_accounts(id) on delete set null,
 profile_id uuid not null references public.bnc_analysis_jobs(id) on delete cascade,profile_revision integer not null,
 source_id uuid references public.bnc_engagement_inbox(id) on delete cascade,
 input_hash text not null check(input_hash ~ '^[a-f0-9]{64}$'),input jsonb not null,
 sources uuid[] not null,neighbor_id text not null,post_id text not null,parent_comment_id text,
 state text not null default 'queued' check(state in ('queued','running','succeeded','uncertain','cancelled')),
 run_hash text check(run_hash is null or run_hash ~ '^[a-f0-9]{64}$'),started_at timestamptz,result jsonb,draft_job_id uuid references public.bnc_jobs(id) on delete set null,
 created_at timestamptz not null default clock_timestamp(),expires_at timestamptz not null check(expires_at<=created_at+interval '720 hours')
);
create index bnc_message_owner on public.bnc_message_jobs(user_id,created_at desc);
alter table public.bnc_message_jobs enable row level security;
revoke all on public.bnc_message_jobs from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.bnc_message_jobs to service_role;
-- Member data is returned only through authenticated, whitelisted API operations.
create function public.bnc_message_dispatch(p_user_id uuid,p_operation text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.bnc_message_jobs;p public.bnc_analysis_jobs;e public.bnc_analysis_jobs;x public.bnc_engagement_inbox;a public.member_platform_accounts;
 src public.bnc_analysis_sources;t timestamptz:=clock_timestamp();deadline timestamptz;first_created timestamptz;first_expiry timestamptz;
 ids uuid[]:='{}';item jsonb;target text;post text:='';parent text;draft jsonb;n integer;
begin
 if p_operation='cleanup' then
  if p_user_id is not null or p_payload is distinct from '{}'::jsonb then raise exception 'BNC_MESSAGE_INPUT';end if;
  delete from public.bnc_message_jobs where expires_at<=t;get diagnostics n=row_count;return jsonb_build_object('expiredMessagesRemoved',n);
 end if;
 if p_user_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'BNC_MESSAGE_INPUT';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,71030));
 if p_operation='list' then
  return jsonb_build_object(
   'profiles',(select coalesce(jsonb_agg(z),'[]') from(select id,revision,reviewed_result->'profile'->'topics' as topics from public.bnc_analysis_jobs where user_id=p_user_id and kind='profile' and state='succeeded' and reviewed_result is not null and expires_at>t order by created_at desc limit 50)z),
   'accounts',(select coalesce(jsonb_agg(z),'[]') from(select id,external_id from public.member_platform_accounts where user_id=p_user_id and platform='naver_blog' and not needs_reconnect limit 50)z),
   'candidates',(select coalesce(jsonb_agg(z),'[]') from(select id,profile_job_id,profile_revision,selection from public.bnc_analysis_jobs where user_id=p_user_id and kind='candidates' and state='succeeded' and cardinality(selection)>0 and expires_at>t order by created_at desc limit 50)z),
   'replies',(select coalesce(jsonb_agg(z),'[]') from(select id,neighbor_id,own_post_id,comment_id from public.bnc_engagement_inbox where user_id=p_user_id and expires_at>t and reply_job_id is null order by observed_at desc limit 50)z),
   'materials',(select coalesce(jsonb_agg(z),'[]') from(select id,blog_id,post_id,title from public.bnc_reader_materials where user_id=p_user_id and expires_at>t order by created_at desc limit 50)z),
   'jobs',(select coalesce(jsonb_agg(z),'[]') from(select id,kind,case when state='running' and started_at<t-interval '2 minutes' then 'uncertain' else state end as state,expires_at from public.bnc_message_jobs where user_id=p_user_id and expires_at>t order by created_at desc limit 50)z));
 end if;
 if p_operation='material' then
  return (select jsonb_build_object('id',id,'url','https://blog.naver.com/'||blog_id||'/'||post_id,'title',title,'body',body) from public.bnc_reader_materials where id=(p_payload->>'id')::uuid and user_id=p_user_id and expires_at>t);
 end if;
 if p_operation='prepare' then
  select * into j from public.bnc_message_jobs where id=(p_payload->>'id')::uuid;
  if found then
   if j.user_id<>p_user_id or j.expires_at<=t then raise exception 'BNC_MESSAGE_NOT_FOUND';end if;
   if j.input_hash is distinct from p_payload->>'input_hash' then raise exception 'BNC_MESSAGE_CHANGED';end if;
   return jsonb_build_object('id',j.id,'state',case when j.state='running' and j.started_at<t-interval '2 minutes' then 'uncertain' else j.state end);
  end if;
  if (select count(*) from public.bnc_message_jobs where user_id=p_user_id and expires_at>t and(state='queued' or(state='running' and started_at>t-interval '2 minutes')))>=5 then raise exception 'BNC_MESSAGE_LIMIT';end if;
  select * into p from public.bnc_analysis_jobs where id=(p_payload->'input'->>'profileId')::uuid and user_id=p_user_id and kind='profile' and state='succeeded' and reviewed_result is not null and expires_at>t+interval '90 seconds';
  if not found or p.revision<>(p_payload->'input'->>'profileRevision')::integer then raise exception 'BNC_MESSAGE_PROFILE';end if;
  select * into a from public.member_platform_accounts where id=(p_payload->'input'->>'accountId')::uuid and user_id=p_user_id and platform='naver_blog' and not needs_reconnect and external_id=p.input->>'ownBlogId';
  if not found then raise exception 'BNC_MESSAGE_ACCOUNT';end if;deadline:=p.expires_at;
  if p_payload->>'kind'='request' then
   select * into e from public.bnc_analysis_jobs where id=(p_payload->'input'->>'candidateId')::uuid and user_id=p_user_id and kind='candidates' and state='succeeded' and profile_job_id=p.id and profile_revision=p.revision and expires_at>t+interval '90 seconds';
   target:=p_payload->'input'->>'neighborId';if not found or not(target=any(e.selection)) or target=a.external_id then raise exception 'BNC_MESSAGE_CANDIDATE';end if;
   select array_agg(id order by id),min(expires_at) into ids,first_expiry from public.bnc_analysis_sources where id=any(e.source_ids) and user_id=p_user_id and blog_id=target and expires_at>t+interval '90 seconds';
   if cardinality(ids) not between 3 and 5 or ids is null then raise exception 'BNC_MESSAGE_SOURCE';end if;deadline:=least(deadline,e.expires_at,first_expiry);
  else
   item:=p_payload->'input'->'post';target:=item->>'blogId';post:=item->>'postId';
   if p_payload->>'kind'='reply' then
    select * into x from public.bnc_engagement_inbox where id=(p_payload->'input'->>'sourceId')::uuid and user_id=p_user_id and account_id=a.id and actor_id=a.external_id and expires_at>t+interval '90 seconds' and reply_job_id is null;
    if not found or target<>a.external_id or post<>x.own_post_id then raise exception 'BNC_MESSAGE_SOURCE';end if;target:=x.neighbor_id;parent:=x.comment_id;deadline:=least(deadline,x.expires_at);
   elsif p_payload->>'kind'<>'comment' or target=a.external_id then raise exception 'BNC_MESSAGE_INPUT';end if;
   select min(created_at),min(expires_at) into first_created,first_expiry from (select created_at,expires_at from public.bnc_analysis_sources where user_id=p_user_id and blog_id=item->>'blogId' and post_id=post union all select created_at,expires_at from public.bnc_reader_materials where user_id=p_user_id and blog_id=item->>'blogId' and post_id=post) original_sources;
   insert into public.bnc_analysis_sources(user_id,blog_id,post_id,title,body,content_hash,created_at,expires_at)
    values(p_user_id,item->>'blogId',post,item->>'title',item->>'body',item->>'hash',coalesce(first_created,t),coalesce(first_expiry,t+interval '720 hours')) on conflict(user_id,blog_id,post_id,content_hash) do nothing;
   select * into src from public.bnc_analysis_sources where user_id=p_user_id and blog_id=item->>'blogId' and post_id=post and content_hash=item->>'hash';
   if not found or src.expires_at<=t+interval '90 seconds' then raise exception 'BNC_MESSAGE_SOURCE';end if;ids:=array[src.id];deadline:=least(deadline,src.expires_at);
  end if;
  insert into public.bnc_message_jobs(id,user_id,kind,account_id,profile_id,profile_revision,source_id,input_hash,input,sources,neighbor_id,post_id,parent_comment_id,expires_at)
   values((p_payload->>'id')::uuid,p_user_id,p_payload->>'kind',a.id,p.id,p.revision,x.id,p_payload->>'input_hash',(p_payload->'input')-'post',ids,target,post,parent,deadline) returning * into j;
  return jsonb_build_object('id',j.id,'state',j.state);
 end if;
 select * into j from public.bnc_message_jobs where id=(p_payload->>'id')::uuid and user_id=p_user_id and expires_at>t for update;
 if not found then raise exception 'BNC_MESSAGE_NOT_FOUND';end if;
 select * into p from public.bnc_analysis_jobs where id=j.profile_id and user_id=p_user_id;
 if p_operation='get' then return jsonb_build_object('id',j.id,'kind',j.kind,'neighborId',j.neighbor_id,'postId',j.post_id,'parentCommentId',j.parent_comment_id,'state',case when j.state='running' and j.started_at<t-interval '2 minutes' then 'uncertain' else j.state end,'result',j.result,'draftJobId',j.draft_job_id,'profileStale',p.revision is distinct from j.profile_revision,'provider',j.input->>'provider','model',j.input->>'model','expiresAt',j.expires_at);end if;
 if p_operation='cancel' and j.state='queued' then update public.bnc_message_jobs set state='cancelled' where id=j.id;return jsonb_build_object('id',j.id,'state','cancelled');end if;
 if p_operation='uncertain' and j.state='running' and j.run_hash=p_payload->>'run_hash' then update public.bnc_message_jobs set state='uncertain' where id=j.id;return jsonb_build_object('id',j.id,'state','uncertain');end if;
 if p.revision is distinct from j.profile_revision or p.expires_at<=t or p.reviewed_result is null then raise exception 'BNC_MESSAGE_PROFILE';end if;
 if p_operation in ('claim','adopt') and not exists(select 1 from public.member_platform_accounts where id=j.account_id and user_id=p_user_id and platform='naver_blog' and not needs_reconnect and external_id=p.input->>'ownBlogId') then raise exception 'BNC_MESSAGE_ACCOUNT';end if;
 if p_operation='claim' then
  if j.state<>'queued' or j.expires_at<=t+interval '60 seconds' or (select count(*) from public.bnc_analysis_sources where id=any(j.sources) and user_id=p_user_id and expires_at>t)<>cardinality(j.sources) then raise exception 'BNC_MESSAGE_SOURCE';end if;
  update public.bnc_message_jobs set state='running',run_hash=p_payload->>'run_hash',started_at=t where id=j.id;
  return jsonb_build_object('id',j.id,'kind',j.kind,'input',j.input,'profile',p.reviewed_result,'expiresAt',j.expires_at,
   'posts',(select jsonb_agg(jsonb_build_object('id',s.id,'title',s.title,'body',s.body) order by s.id) from public.bnc_analysis_sources s where s.id=any(j.sources) and s.user_id=p_user_id),
   'previousTexts',(select coalesce(jsonb_agg(q.body),'[]') from(select body from public.bnc_jobs where user_id=p_user_id and kind in ('comment','reply') and expires_at>t and body<>'' order by created_at desc limit 30)q));
 end if;
 if p_operation='complete' then
  if j.state<>'running' or j.run_hash is distinct from p_payload->>'run_hash' then raise exception 'BNC_MESSAGE_CLAIM';end if;
  update public.bnc_message_jobs set result=p_payload->'result',state='succeeded' where id=j.id;return jsonb_build_object('id',j.id,'state','succeeded');
 end if;
 if p_operation='adopt' then
  if j.state<>'succeeded' or p_payload->'confirmed' is distinct from 'true'::jsonb or char_length(trim(p_payload->>'text')) not between 30 and (case when j.kind='request' then 200 else 600 end) or p_payload->>'text' ~* '(https?://|www\.)' then raise exception 'BNC_MESSAGE_INPUT';end if;
  if j.draft_job_id is not null then return jsonb_build_object('draftJobId',j.draft_job_id,'reused',true);end if;
  if j.kind='reply' then
   draft:=public.bnc_engagement_dispatch(p_user_id,'reply',jsonb_build_object('id',j.source_id,'body',p_payload->>'text'));
  else
   draft:=public.bnc_dispatch(p_user_id,'create',jsonb_build_object('account_id',j.account_id,'neighbor_id',j.neighbor_id,'post_id',j.post_id,'kind',j.kind,'body',p_payload->>'text'));
  end if;
  update public.bnc_jobs set expires_at=least(expires_at,j.expires_at) where id=(draft->>'id')::uuid and user_id=p_user_id;
  update public.bnc_message_jobs set draft_job_id=(draft->>'id')::uuid where id=j.id;
  return jsonb_build_object('draftJobId',draft->>'id','state','draft','executionEnabled',false);
 end if;
 raise exception 'BNC_MESSAGE_INPUT';
end $$;
revoke all on function public.bnc_message_dispatch(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_message_dispatch(uuid,text,jsonb) to service_role;
commit;
