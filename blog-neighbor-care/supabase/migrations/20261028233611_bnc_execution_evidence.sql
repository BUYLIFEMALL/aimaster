begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

create table public.bnc_execution_evidence (
 job_id uuid not null references public.bnc_jobs(id) on delete cascade,
 generation bigint not null check(generation>0),
 user_id uuid not null references public.bnc_settings(user_id) on delete cascade,
 device_id uuid not null,
 proof jsonb not null check(jsonb_typeof(proof)='object' and octet_length(proof::text)<=2048),
 attempted_at timestamptz not null,
 observed_at timestamptz not null check(observed_at>=attempted_at),
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null,
 primary key(job_id,generation)
);
create index bnc_execution_evidence_expiry on public.bnc_execution_evidence(expires_at);
create index bnc_execution_evidence_owner on public.bnc_execution_evidence(user_id,expires_at);
alter table public.bnc_execution_evidence enable row level security;
revoke all on public.bnc_execution_evidence from public,anon,authenticated,service_role;
grant select on public.bnc_execution_evidence to authenticated;
grant select,insert,delete on public.bnc_execution_evidence to service_role;
create policy bnc_execution_evidence_owner_read on public.bnc_execution_evidence for select to authenticated
 using(user_id=(select auth.uid()) and expires_at>now());

create function public.bnc_execution_result_dispatch(p_user_id uuid,p_operation text,p_payload jsonb)
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
 if p_payload->>'outcome' is distinct from 'success' or p_payload->'verified' is distinct from 'true'::jsonb or j.kind not in ('request','like','comment') then raise exception 'BNC_EVIDENCE_INPUT';end if;
 if j.expires_at<=v_now then raise exception 'BNC_EVIDENCE_EXPIRED';end if;
 e:=p_payload->'evidence';
 if jsonb_typeof(e) is distinct from 'object' or octet_length(e::text)>2048 or
  exists(select 1 from jsonb_object_keys(e) k where k not in ('account_id','actor_id','neighbor_id','post_id','kind','state','effect_id','body_hash','observed_at')) then raise exception 'BNC_EVIDENCE_INPUT';end if;
 if e->>'account_id' is distinct from j.account_id::text or e->>'actor_id' is distinct from j.actor_id or e->>'neighbor_id' is distinct from j.neighbor_id or
  e->>'post_id' is distinct from j.post_id or e->>'kind' is distinct from j.kind or
  e->>'state' is distinct from (case j.kind when 'request' then 'pending' when 'like' then 'liked' else 'commented' end) then raise exception 'BNC_EVIDENCE_CONTEXT';end if;
 if j.kind='comment' then
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
