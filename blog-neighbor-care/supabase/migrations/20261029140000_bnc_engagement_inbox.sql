-- Local implementation only. Operating application requires separate approval.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

create table public.bnc_engagement_inbox (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.bnc_settings(user_id) on delete cascade,
 account_id uuid not null references public.member_platform_accounts(id) on delete cascade,
 actor_id text not null check(actor_id ~ '^[a-z0-9_-]{1,50}$'),
 neighbor_id text not null check(neighbor_id ~ '^[a-z0-9_-]{1,50}$' and neighbor_id<>actor_id),
 own_post_id text not null check(own_post_id ~ '^[0-9]{1,30}$'),
 comment_id text not null check(comment_id ~ '^[a-zA-Z0-9_-]{1,128}$'),
 return_post_id text check(return_post_id ~ '^[0-9]{1,30}$'),
 observed_at timestamptz not null,
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null,
 reply_job_id uuid references public.bnc_jobs(id) on delete cascade,
 visit_job_id uuid references public.bnc_jobs(id) on delete cascade,
 unique(user_id,account_id,own_post_id,comment_id),
 check(observed_at<=created_at and observed_at>created_at-interval '5 minutes'),
 check(expires_at=observed_at+interval '720 hours')
);
create index bnc_engagement_owner_expiry on public.bnc_engagement_inbox(user_id,expires_at);
alter table public.bnc_engagement_inbox enable row level security;
revoke all on public.bnc_engagement_inbox from public,anon,authenticated,service_role;
grant select on public.bnc_engagement_inbox to authenticated;
grant select,insert,update,delete on public.bnc_engagement_inbox to service_role;
create policy bnc_engagement_owner on public.bnc_engagement_inbox for select to authenticated
 using(user_id=(select auth.uid()) and expires_at>now());

create function bnc_private.guard_engagement_source() returns trigger
language plpgsql security invoker set search_path='' as $$ begin
 if row(new.user_id,new.account_id,new.actor_id,new.neighbor_id,new.own_post_id,new.comment_id,new.return_post_id,new.observed_at,new.created_at,new.expires_at)
  is distinct from row(old.user_id,old.account_id,old.actor_id,old.neighbor_id,old.own_post_id,old.comment_id,old.return_post_id,old.observed_at,old.created_at,old.expires_at)
  then raise exception 'BNC_SOURCE_CHANGED';end if;
 return new;
end $$;
revoke all on function bnc_private.guard_engagement_source() from public,anon,authenticated;
grant execute on function bnc_private.guard_engagement_source() to service_role;
create trigger bnc_engagement_source_guard before update on public.bnc_engagement_inbox
 for each row execute function bnc_private.guard_engagement_source();

alter table public.bnc_jobs add column parent_comment_id text
 check(parent_comment_id ~ '^[a-zA-Z0-9_-]{1,128}$');
-- Derived drafts inherit the source deadline; they can shorten, never extend it.
do $$ declare c record; n integer:=0; begin
 for c in select conname from pg_constraint where conrelid='public.bnc_jobs'::regclass and contype='c'
  and pg_get_constraintdef(oid) like '%expires_at%created_at%720%' loop
  execute format('alter table public.bnc_jobs drop constraint %I',c.conname); n:=n+1;
 end loop;
 if n<>1 then raise exception 'BNC_EXPIRY_CONSTRAINT_REQUIRED';end if;
end $$;
alter table public.bnc_jobs add constraint bnc_jobs_bounded_expiry
 check(expires_at>created_at and expires_at<=created_at+interval '720 hours');

create function bnc_private.guard_reply_target() returns trigger
language plpgsql security invoker set search_path='' as $$ begin
 if new.kind<>'reply' and new.parent_comment_id is not null then raise exception 'BNC_REPLY_TARGET';end if;
 if new.kind='reply' and new.state<>'draft' and new.parent_comment_id is null then raise exception 'BNC_REPLY_TARGET';end if;
 if TG_OP='UPDATE' and old.kind='reply' and (old.parent_comment_id is not null or old.state<>'draft') and
  (row(new.actor_id,new.neighbor_id,new.post_id,new.kind,new.parent_comment_id)
  is distinct from row(old.actor_id,old.neighbor_id,old.post_id,old.kind,old.parent_comment_id)
  or (new.account_id is not null and new.account_id is distinct from old.account_id))
  then raise exception 'BNC_REPLY_TARGET_CHANGED';end if;
 return new;
end $$;
revoke all on function bnc_private.guard_reply_target() from public,anon,authenticated;
grant execute on function bnc_private.guard_reply_target() to service_role;
create trigger bnc_reply_target_guard before insert or update on public.bnc_jobs
 for each row execute function bnc_private.guard_reply_target();

-- Server supplies authenticated user. No intake/observe/execute operation here.
create function public.bnc_engagement_dispatch(p_user_id uuid,p_operation text,p_payload jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.bnc_settings; x public.bnc_engagement_inbox; j jsonb; v_now timestamptz:=clock_timestamp();
begin
 if p_user_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'BNC_INVALID_INPUT';end if;
 insert into public.bnc_settings(user_id) values(p_user_id) on conflict do nothing;
 perform 1 from public.bnc_settings where user_id=p_user_id for update;
 if p_operation='list' then
  if p_payload<>'{}'::jsonb then raise exception 'BNC_INVALID_INPUT';end if;
  return (select coalesce(jsonb_agg(to_jsonb(z)),'[]') from
   (select id,neighbor_id,own_post_id,comment_id,return_post_id,observed_at,expires_at,reply_job_id,visit_job_id
    from public.bnc_engagement_inbox where user_id=p_user_id and expires_at>v_now order by observed_at desc,id limit 50) z);
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
 if p_operation='return_visit' and x.return_post_id is null then raise exception 'BNC_RETURN_POST_REQUIRED';end if;
 j:=public.bnc_dispatch(p_user_id,'create',jsonb_build_object('account_id',x.account_id,'neighbor_id',x.neighbor_id,
  'post_id',case p_operation when 'reply' then x.own_post_id else x.return_post_id end,
  'kind',case p_operation when 'reply' then 'reply' else 'comment' end,'body',p_payload->>'body'));
 update public.bnc_jobs set parent_comment_id=case p_operation when 'reply' then x.comment_id else null end,
  expires_at=x.expires_at where id=(j->>'id')::uuid and user_id=p_user_id returning to_jsonb(bnc_jobs.*) into j;
 update public.bnc_engagement_inbox set reply_job_id=case p_operation when 'reply' then (j->>'id')::uuid else reply_job_id end,
  visit_job_id=case p_operation when 'return_visit' then (j->>'id')::uuid else visit_job_id end where id=x.id;
 return j;
end $$;
revoke all on function public.bnc_engagement_dispatch(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_engagement_dispatch(uuid,text,jsonb) to service_role;

create function public.bnc_engagement_cleanup(p_user_id uuid,p_operation text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$ declare n integer; begin
 if p_user_id is not null or p_operation is distinct from 'cleanup' or p_payload is distinct from '{}'::jsonb then raise exception 'BNC_INVALID_INPUT';end if;
 if not pg_try_advisory_xact_lock(hashtextextended('bnc_engagement_cleanup',0)) then return jsonb_build_object('expiredEngagementsRemoved',0);end if;
 with doomed as(select id from public.bnc_engagement_inbox where expires_at<=clock_timestamp() order by expires_at,id limit 1000)
 delete from public.bnc_engagement_inbox i using doomed d where i.id=d.id;
 get diagnostics n=row_count;return jsonb_build_object('expiredEngagementsRemoved',n);
end $$;
revoke all on function public.bnc_engagement_cleanup(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_engagement_cleanup(uuid,text,jsonb) to service_role;

create or replace function public.bnc_execution_result_dispatch(p_user_id uuid,p_operation text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
 j public.bnc_jobs; e jsonb; old public.bnc_execution_evidence;
 v_now timestamptz:=clock_timestamp(); v_attempt timestamptz; v_observed timestamptz; n integer;
begin
 if p_operation='cleanup' then
  if p_user_id is not null or p_payload is distinct from '{}'::jsonb then raise exception 'BNC_EVIDENCE_INPUT'; end if;
  -- SELECT FOR UPDATE needs UPDATE privilege. Keep evidence immutable and
  -- serialize only competing cleanup invocations with a transaction lock.
  if not pg_try_advisory_xact_lock(hashtextextended('bnc_execution_evidence_cleanup',0)) then return jsonb_build_object('expiredEvidenceRemoved',0);end if;
  with doomed as(select job_id,generation from public.bnc_execution_evidence where expires_at<=v_now order by expires_at,job_id,generation limit 1000)
  delete from public.bnc_execution_evidence e using doomed d where e.job_id=d.job_id and e.generation=d.generation;
  get diagnostics n=row_count;return jsonb_build_object('expiredEvidenceRemoved',n);
 end if;
 if p_operation is distinct from 'result' or p_user_id is null or jsonb_typeof(p_payload) is distinct from 'object' or
  exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('id','device_id','generation','outcome','verified','attempted_at','evidence')) then raise exception 'BNC_EVIDENCE_INPUT'; end if;
 perform 1 from public.bnc_settings where user_id=p_user_id for update;
 select * into j from public.bnc_jobs where id=(p_payload->>'id')::uuid and user_id=p_user_id for update;
 if not found then raise exception 'BNC_NOT_FOUND'; end if;
 if j.generation is distinct from (p_payload->>'generation')::bigint or j.device_id is distinct from (p_payload->>'device_id')::uuid then raise exception 'BNC_STALE_CLAIM'; end if;
 if p_payload->>'outcome'='uncertain' and p_payload->'verified'='false'::jsonb then
  if p_payload ? 'evidence' or p_payload ? 'attempted_at' then raise exception 'BNC_EVIDENCE_INPUT';end if;
  return public.bnc_dispatch(p_user_id,'result',p_payload);
 end if;
 if p_payload->>'outcome' is distinct from 'success' or p_payload->'verified' is distinct from 'true'::jsonb or j.kind not in ('request','like','comment','reply') then raise exception 'BNC_EVIDENCE_INPUT';end if;
 if j.expires_at<=v_now then raise exception 'BNC_EVIDENCE_EXPIRED';end if;
 e:=p_payload->'evidence';
 if jsonb_typeof(e) is distinct from 'object' or octet_length(e::text)>2048 or
  exists(select 1 from jsonb_object_keys(e) k where k not in ('account_id','actor_id','neighbor_id','post_id','kind','state','effect_id','body_hash','observed_at','parent_comment_id')) then raise exception 'BNC_EVIDENCE_INPUT';end if;
 if e->>'account_id' is distinct from j.account_id::text or e->>'actor_id' is distinct from j.actor_id or e->>'neighbor_id' is distinct from j.neighbor_id or
  e->>'post_id' is distinct from j.post_id or e->>'kind' is distinct from j.kind or
  e->>'state' is distinct from (case j.kind when 'request' then 'pending' when 'like' then 'liked' else 'commented' end) then raise exception 'BNC_EVIDENCE_CONTEXT';end if;
 if j.kind='reply' and (j.parent_comment_id is null or e->>'parent_comment_id' is distinct from j.parent_comment_id) then raise exception 'BNC_EVIDENCE_CONTEXT';end if;
 if j.kind<>'reply' and coalesce(e->'parent_comment_id','null'::jsonb)<>'null'::jsonb then raise exception 'BNC_EVIDENCE_CONTEXT';end if;
 if j.kind in ('comment','reply') then
  if coalesce(e->>'effect_id','') !~ '^[a-zA-Z0-9_-]{1,128}$' or e->>'body_hash' is distinct from encode(sha256(convert_to(j.body,'UTF8')),'hex') then raise exception 'BNC_EVIDENCE_CONTEXT';end if;
 elsif coalesce(e->'effect_id','null'::jsonb)<>'null'::jsonb or coalesce(e->'body_hash','null'::jsonb)<>'null'::jsonb then raise exception 'BNC_EVIDENCE_INPUT';end if;
 v_attempt:=(p_payload->>'attempted_at')::timestamptz;v_observed:=(e->>'observed_at')::timestamptz;
 if v_attempt is null or v_observed is null or v_observed<v_attempt or v_attempt<j.created_at or v_observed>v_now+interval '1 second' or v_attempt>=j.expires_at then raise exception 'BNC_EVIDENCE_TIME';end if;
 select * into old from public.bnc_execution_evidence where job_id=j.id and generation=j.generation;
 if found then
  if old.proof is distinct from e or old.attempted_at is distinct from v_attempt or old.user_id<>p_user_id or old.device_id<>j.device_id then raise exception 'BNC_EVIDENCE_CHANGED';end if;
 else
  if v_observed<v_now-interval '60 seconds' then raise exception 'BNC_EVIDENCE_TIME';end if;
  insert into public.bnc_execution_evidence(job_id,generation,user_id,device_id,proof,attempted_at,observed_at,expires_at)
   values(j.id,j.generation,p_user_id,j.device_id,e,v_attempt,v_observed,j.expires_at);
 end if;
 -- Evidence and success counters commit or roll back together.
 return public.bnc_dispatch(p_user_id,'result',p_payload);
end $$;
revoke all on function public.bnc_execution_result_dispatch(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_execution_result_dispatch(uuid,text,jsonb) to service_role;
comment on function public.bnc_execution_result_dispatch(uuid,text,jsonb) is 'Private worker only; immutable minimal effect metadata and result settle in one transaction. No platform permission granted.';
commit;
