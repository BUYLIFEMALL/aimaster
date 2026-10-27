-- Local implementation first. Does not enable social actions or change member keys.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create table public.bnc_analysis_sources (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 blog_id text not null, post_id text not null, title text not null, body text not null,
 content_hash text not null check(content_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(), expires_at timestamptz not null default(now()+interval '720 hours'),
 unique(user_id,blog_id,post_id,content_hash), check(expires_at=created_at+interval '720 hours'),
 check(length(title) between 1 and 500),check(length(body) between 1 and 20000)
);
create table public.bnc_analysis_jobs (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('profile','candidates')), input_hash text not null check(input_hash ~ '^[a-f0-9]{64}$'),
 input jsonb not null, material_ids uuid[] not null default '{}', source_ids uuid[] not null default '{}',
 profile_job_id uuid references public.bnc_analysis_jobs(id) on delete cascade, profile_revision integer,
 state text not null default 'queued' check(state in ('queued','running','succeeded','uncertain','cancelled')),
 run_hash text check(run_hash is null or run_hash ~ '^[a-f0-9]{64}$'), run_started_at timestamptz, result jsonb, reviewed_result jsonb, revision integer not null default 0,
 selection text[] not null default '{}', error_code text,
 created_at timestamptz not null default now(), expires_at timestamptz not null,
 check(expires_at<=created_at+interval '720 hours')
);
create index bnc_analysis_jobs_owner on public.bnc_analysis_jobs(user_id,created_at desc);
create index bnc_analysis_sources_owner on public.bnc_analysis_sources(user_id,expires_at);
alter table public.bnc_analysis_sources enable row level security;
alter table public.bnc_analysis_jobs enable row level security;
revoke all on public.bnc_analysis_sources,public.bnc_analysis_jobs from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.bnc_analysis_sources,public.bnc_analysis_jobs to service_role;
-- Keys, prompts and internal run capabilities are not exposed through direct member table access.
create function public.bnc_analysis_dispatch(p_user_id uuid,p_operation text,p_payload jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 j public.bnc_analysis_jobs%rowtype; p public.bnc_analysis_jobs%rowtype;
 s public.bnc_analysis_sources%rowtype; v_now timestamptz:=clock_timestamp(); v_exp timestamptz;
 v_source_created timestamptz; v_source_exp timestamptz;
 v_ids uuid[]; v_sources uuid[]:='{}'; v_blog text; v_posts jsonb; v_item jsonb; v_deleted integer;
begin
 if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'BNC_ANALYSIS_INPUT'; end if;
 if p_operation='cleanup' then
   delete from public.bnc_analysis_jobs where expires_at<=v_now; get diagnostics v_deleted=row_count;
   delete from public.bnc_analysis_sources where expires_at<=v_now;
   return jsonb_build_object('expiredJobsRemoved',v_deleted);
 end if;
 if p_user_id is null then raise exception 'BNC_ANALYSIS_INPUT'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,71028));
 if p_operation='prepare' then
   select * into j from public.bnc_analysis_jobs where id=(p_payload->>'id')::uuid;
   if found then
     if j.user_id<>p_user_id or j.expires_at<=v_now then raise exception 'BNC_ANALYSIS_NOT_FOUND'; end if;
     if j.input_hash is distinct from p_payload->>'input_hash' then raise exception 'BNC_ANALYSIS_CHANGED'; end if;
     return jsonb_build_object('id',j.id,'state',case when j.state='running' and j.run_started_at<v_now-interval '2 minutes' then 'uncertain' else j.state end);
   end if;
   if (select count(*) from public.bnc_analysis_jobs where user_id=p_user_id and expires_at>v_now
       and (state='queued' or (state='running' and run_started_at>v_now-interval '2 minutes')))>=5
     then raise exception 'BNC_ANALYSIS_LIMIT'; end if;
   v_exp:=v_now+interval '720 hours';
   if p_payload->>'kind'='profile' then
     select array_agg(value::uuid order by value) into v_ids from jsonb_array_elements_text(p_payload->'input'->'materialIds');
     if coalesce(cardinality(v_ids),0) not between 1 and 20 or cardinality(v_ids)<>(select count(distinct x) from unnest(v_ids) x)
       then raise exception 'BNC_ANALYSIS_INPUT'; end if;
     if (select count(*) from public.bnc_reader_materials where id=any(v_ids) and user_id=p_user_id and expires_at>v_now+interval '90 seconds')<>cardinality(v_ids)
       then raise exception 'BNC_ANALYSIS_SOURCE_UNAVAILABLE'; end if;
     if (select count(distinct blog_id) from public.bnc_reader_materials where id=any(v_ids))<>1 then raise exception 'BNC_ANALYSIS_WRONG_BLOG'; end if;
     select min(expires_at),min(blog_id) into v_exp,v_blog from public.bnc_reader_materials where id=any(v_ids);
   elsif p_payload->>'kind'='candidates' then
     select * into p from public.bnc_analysis_jobs where id=(p_payload->'input'->>'profileId')::uuid and user_id=p_user_id and kind='profile' and state='succeeded'
       and reviewed_result is not null and expires_at>v_now+interval '90 seconds';
     if not found then raise exception 'BNC_ANALYSIS_PROFILE_REQUIRED'; end if;
     if p.revision<>(p_payload->'input'->>'profileRevision')::integer then raise exception 'BNC_ANALYSIS_STALE_PROFILE'; end if;
     v_exp:=least(v_exp,p.expires_at); v_blog:=p.input->>'ownBlogId';
     if jsonb_array_length(p_payload->'input'->'posts') not between 3 and 20 then raise exception 'BNC_ANALYSIS_INPUT'; end if;
     for v_item in select value from jsonb_array_elements(p_payload->'input'->'posts') loop
       if v_item->>'blogId'=v_blog then raise exception 'BNC_ANALYSIS_WRONG_BLOG'; end if;
       select min(created_at),min(expires_at) into v_source_created,v_source_exp from public.bnc_analysis_sources
         where user_id=p_user_id and blog_id=v_item->>'blogId' and post_id=v_item->>'postId';
       insert into public.bnc_analysis_sources(user_id,blog_id,post_id,title,body,content_hash,created_at,expires_at)
         values(p_user_id,v_item->>'blogId',v_item->>'postId',v_item->>'title',v_item->>'body',v_item->>'hash',
           coalesce(v_source_created,v_now),coalesce(v_source_exp,v_now+interval '720 hours'))
         on conflict(user_id,blog_id,post_id,content_hash) do nothing;
       select * into strict s from public.bnc_analysis_sources where user_id=p_user_id and blog_id=v_item->>'blogId' and post_id=v_item->>'postId' and content_hash=v_item->>'hash';
       if s.expires_at<=v_now+interval '90 seconds' then raise exception 'BNC_ANALYSIS_SOURCE_UNAVAILABLE'; end if;
       v_sources:=array_append(v_sources,s.id); v_exp:=least(v_exp,s.expires_at);
     end loop;
   else raise exception 'BNC_ANALYSIS_INPUT'; end if;
   insert into public.bnc_analysis_jobs(id,user_id,kind,input_hash,input,material_ids,source_ids,profile_job_id,profile_revision,created_at,expires_at)
     values((p_payload->>'id')::uuid,p_user_id,p_payload->>'kind',p_payload->>'input_hash',
       ((p_payload->'input')-'posts')||jsonb_build_object('ownBlogId',v_blog),coalesce(v_ids,'{}'),v_sources,p.id,p.revision,v_now,v_exp) returning * into j;
   return jsonb_build_object('id',j.id,'state',j.state);
 end if;
 if p_operation='list' then
   return coalesce((select jsonb_agg(x) from (select id,kind,case when state='running' and run_started_at<v_now-interval '2 minutes' then 'uncertain' else state end as state,
     revision,created_at,expires_at from public.bnc_analysis_jobs where user_id=p_user_id and expires_at>v_now order by created_at desc limit 50) x),'[]');
 end if;
 select * into j from public.bnc_analysis_jobs where id=(p_payload->>'id')::uuid and user_id=p_user_id and expires_at>v_now for update;
 if not found then raise exception 'BNC_ANALYSIS_NOT_FOUND'; end if;
 if p_operation='cancel' then
   if j.state<>'queued' then raise exception 'BNC_ANALYSIS_ALREADY_STARTED'; end if;
   update public.bnc_analysis_jobs set state='cancelled' where id=j.id;
   return jsonb_build_object('id',j.id,'state','cancelled','externalActions',0);
 end if;
 if p_operation='get' then
   if j.profile_job_id is not null then select * into p from public.bnc_analysis_jobs where id=j.profile_job_id; end if;
   return jsonb_build_object('id',j.id,'kind',j.kind,'state',case when j.state='running' and j.run_started_at<v_now-interval '2 minutes' then 'uncertain' else j.state end,
     'result',j.result,'preferences',j.input->'preferences','reviewedProfile',j.reviewed_result,'revision',j.revision,'selection',j.selection,
     'profileStale',j.profile_job_id is not null and (p.revision is distinct from j.profile_revision),
     'provider',j.input->>'provider','model',j.input->>'model','errorCode',j.error_code,'createdAt',j.created_at,'expiresAt',j.expires_at);
 end if;
 if p_operation='claim' then
   if coalesce(p_payload->>'run_hash','') !~ '^[a-f0-9]{64}$' then raise exception 'BNC_ANALYSIS_INPUT'; end if;
   if j.state<>'queued' then raise exception 'BNC_ANALYSIS_ALREADY_STARTED'; end if;
   if j.expires_at<=v_now+interval '60 seconds' then raise exception 'BNC_ANALYSIS_SOURCE_UNAVAILABLE'; end if;
   if j.kind='profile' then
     select jsonb_agg(jsonb_build_object('id',id,'blogId',blog_id,'postId',post_id,'title',title,'body',left(body,4000),
       'originalCharacterCount',length(body),'bodyTruncated',length(body)>4000,'source','member-initiated-browser-read') order by id) into v_posts
       from public.bnc_reader_materials where id=any(j.material_ids) and user_id=p_user_id and expires_at>v_now;
     if coalesce(jsonb_array_length(v_posts),0)<>cardinality(j.material_ids) then raise exception 'BNC_ANALYSIS_SOURCE_UNAVAILABLE'; end if;
   else
     select * into p from public.bnc_analysis_jobs where id=j.profile_job_id and user_id=p_user_id and expires_at>v_now;
     if not found or p.revision is distinct from j.profile_revision then raise exception 'BNC_ANALYSIS_STALE_PROFILE'; end if;
     select jsonb_agg(jsonb_build_object('id',id,'blogId',blog_id,'postId',post_id,'title',title,'body',body,'source','member-provided-text','authenticityVerified',false) order by id) into v_posts
       from public.bnc_analysis_sources where id=any(j.source_ids) and user_id=p_user_id and expires_at>v_now;
     if coalesce(jsonb_array_length(v_posts),0)<>cardinality(j.source_ids) then raise exception 'BNC_ANALYSIS_SOURCE_UNAVAILABLE'; end if;
   end if;
   update public.bnc_analysis_jobs set state='running',run_hash=p_payload->>'run_hash',run_started_at=v_now where id=j.id;
   return jsonb_build_object('id',j.id,'kind',j.kind,'input',j.input,'posts',v_posts,'profile',p.reviewed_result,'expiresAt',j.expires_at);
 end if;
 if p_operation in ('complete','uncertain') then
   if j.state<>'running' or j.run_hash is distinct from p_payload->>'run_hash' then raise exception 'BNC_ANALYSIS_RUN_MISMATCH'; end if;
   update public.bnc_analysis_jobs set state=case when p_operation='complete' then 'succeeded' else 'uncertain' end,
     result=case when p_operation='complete' then p_payload->'result' else null end,
     error_code=case when p_operation='uncertain' then 'GENERATION_UNCONFIRMED' else null end,run_hash=null where id=j.id;
   return jsonb_build_object('id',j.id,'state',case when p_operation='complete' then 'succeeded' else 'uncertain' end);
 end if;
 if p_operation='review_profile' then
   if j.kind<>'profile' or j.state<>'succeeded' or j.revision<>(p_payload->>'revision')::integer then raise exception 'BNC_ANALYSIS_STALE_PROFILE'; end if;
   update public.bnc_analysis_jobs set reviewed_result=p_payload->'profile',revision=revision+1 where id=j.id;
   return jsonb_build_object('id',j.id,'revision',j.revision+1);
 end if;
 if p_operation='select_candidates' then
   select * into p from public.bnc_analysis_jobs where id=j.profile_job_id and user_id=p_user_id and expires_at>v_now;
   if j.kind<>'candidates' or j.state<>'succeeded' or not found or p.revision is distinct from j.profile_revision then raise exception 'BNC_ANALYSIS_STALE_PROFILE'; end if;
   if exists(select 1 from jsonb_array_elements_text(p_payload->'blogIds') x where not exists(select 1 from jsonb_array_elements(j.result->'candidates') c where c->>'blogId'=x.value))
     then raise exception 'BNC_ANALYSIS_INPUT'; end if;
   update public.bnc_analysis_jobs set selection=array(select jsonb_array_elements_text(p_payload->'blogIds')) where id=j.id;
   return jsonb_build_object('id',j.id,'selection',p_payload->'blogIds','externalActions',0);
 end if;
 raise exception 'BNC_ANALYSIS_INPUT';
end $$;
revoke all on function public.bnc_analysis_dispatch(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_analysis_dispatch(uuid,text,jsonb) to service_role;
commit;
