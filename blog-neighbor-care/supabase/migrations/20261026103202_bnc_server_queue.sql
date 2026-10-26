-- 운영 적용 전 검수본. 새 bnc_* 객체만 생성, 기존 회원/프로그램/키/계정은 수정하지 않는다.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

create schema bnc_private;
revoke all on schema bnc_private from public, anon, authenticated;
grant usage on schema bnc_private to service_role;

create table public.bnc_runtime (
  singleton boolean primary key default true check (singleton),
  live_allowed boolean not null default false,
  policy_reference text,
  check (not live_allowed or nullif(btrim(policy_reference), '') is not null)
);
insert into public.bnc_runtime(singleton) values(true);

create table public.bnc_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  request_cap integer not null default 20 check (request_cap between 0 and 20),
  like_cap integer not null default 100 check (like_cap between 0 and 100),
  comment_cap integer not null default 30 check (comment_cap between 0 and 30),
  mode text not null default 'review' check (mode in ('review','auto')),
  enabled boolean not null default false,
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now()
);

create table public.bnc_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.bnc_settings(user_id) on delete cascade,
  account_id uuid references public.member_platform_accounts(id) on delete set null,
  actor_id text not null check (actor_id ~ '^[a-z0-9_-]+$'),
  neighbor_id text not null check (neighbor_id ~ '^[a-z0-9_-]+$'),
  post_id text not null default '',
  kind text not null check (kind in ('request','like','comment','reply')),
  budget_kind text generated always as (case when kind='reply' then 'comment' else kind end) stored,
  body text not null default '' check (length(body) <= 4000),
  state text not null default 'draft' check (state in
    ('draft','ready','claimed','armed','succeeded','uncertain','failed_no_effect','skipped')),
  approval_hash text,
  approval_revision bigint,
  generation bigint not null default 0 check (generation >= 0),
  device_id uuid,
  claim_day date,
  lease_until timestamptz,
  permit_until timestamptz,
  reserved boolean not null default false,
  like_state boolean,
  observed_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '720 hours'),
  check (expires_at=created_at+interval '720 hours'),
  check (kind='request' or post_id ~ '^[0-9]+$'),
  check (actor_id<>neighbor_id),
  check (kind not in ('comment','reply') or body !~* '(https?://|www\.)')
);
create index bnc_jobs_owner_created on public.bnc_jobs(user_id,created_at desc);
create unique index bnc_jobs_action_guard on public.bnc_jobs(user_id,actor_id,neighbor_id,post_id,budget_kind)
  where state in ('claimed','armed','uncertain','succeeded');

create table public.bnc_daily (
  user_id uuid not null references public.bnc_settings(user_id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('request','like','comment')),
  reserved integer not null default 0 check (reserved>=0),
  succeeded integer not null default 0 check (succeeded>=0),
  primary key(user_id,day,kind),
  check (reserved+succeeded <= case kind when 'request' then 20 when 'like' then 100 else 30 end)
);
create table public.bnc_comment_slots (
  user_id uuid not null references public.bnc_settings(user_id) on delete cascade,
  neighbor_id text not null,
  day date not null,
  job_id uuid not null references public.bnc_jobs(id) on delete cascade,
  primary key(user_id,neighbor_id,day)
);
create table public.bnc_neighbors (
  user_id uuid not null references public.bnc_settings(user_id) on delete cascade,
  account_id uuid not null references public.member_platform_accounts(id) on delete cascade,
  neighbor_id text not null,
  state text not null check (state in ('unknown','pending','mutual','removed')),
  verified_at timestamptz not null,
  primary key(user_id,account_id,neighbor_id)
);

alter table public.bnc_runtime enable row level security;
alter table public.bnc_settings enable row level security;
alter table public.bnc_jobs enable row level security;
alter table public.bnc_daily enable row level security;
alter table public.bnc_comment_slots enable row level security;
alter table public.bnc_neighbors enable row level security;
revoke all on public.bnc_runtime,public.bnc_settings,public.bnc_jobs,public.bnc_daily,
  public.bnc_comment_slots,public.bnc_neighbors from public,anon,authenticated,service_role;
grant select on public.bnc_settings,public.bnc_jobs,public.bnc_daily,public.bnc_comment_slots,public.bnc_neighbors to authenticated;
grant select on public.bnc_runtime to service_role;
grant select,insert,update,delete on public.bnc_settings,public.bnc_jobs,public.bnc_daily,
  public.bnc_comment_slots,public.bnc_neighbors to service_role;
create policy bnc_settings_owner on public.bnc_settings for select to authenticated using ((select auth.uid())=user_id);
create policy bnc_jobs_owner on public.bnc_jobs for select to authenticated using ((select auth.uid())=user_id);
create policy bnc_daily_owner on public.bnc_daily for select to authenticated using ((select auth.uid())=user_id);
create policy bnc_slots_owner on public.bnc_comment_slots for select to authenticated using ((select auth.uid())=user_id);
create policy bnc_neighbors_owner on public.bnc_neighbors for select to authenticated using ((select auth.uid())=user_id);

-- 호출자는 회원설정 행을 먼저 잠근다. 회원이 직접 호출할 수 없는 내부 예약 반환 함수.
create function bnc_private.release_reservation(p_user_id uuid,p_job_id uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare j public.bnc_jobs%rowtype;
begin
  select * into strict j from public.bnc_jobs where user_id=p_user_id and id=p_job_id for update;
  if j.reserved then
    update public.bnc_daily set reserved=reserved-1
      where user_id=p_user_id and day=j.claim_day and kind=j.budget_kind and reserved>0;
    if not found then raise exception 'BNC_COUNTER_MISMATCH'; end if;
    delete from public.bnc_comment_slots where user_id=p_user_id and job_id=j.id;
    update public.bnc_jobs set reserved=false where user_id=p_user_id and id=j.id;
  end if;
end $$;
revoke all on function bnc_private.release_reservation(uuid,uuid) from public,anon,authenticated;
grant execute on function bnc_private.release_reservation(uuid,uuid) to service_role;

-- 회원 ID는 인증/프로그램권한을 확인한 서버가 결합한다. 브라우저 JWT에는 EXECUTE가 없다.
create function public.bnc_dispatch(p_user_id uuid,p_operation text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  s public.bnc_settings%rowtype;
  j public.bnc_jobs%rowtype;
  account record;
  v_now timestamptz;
  v_day date;
  v_cap integer;
  v_count integer;
  v_expired record;
  v_live boolean;
  v_job_id uuid;
  v_device uuid;
  v_hash text;
begin
  if p_user_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'BNC_INVALID_INPUT'; end if;
  insert into public.bnc_settings(user_id) values(p_user_id) on conflict do nothing;
  -- 동일 회원의 설정·모든 계정·날짜·작업은 이 행을 먼저 잠그므로 잠금 순서가 일관된다.
  select * into strict s from public.bnc_settings where user_id=p_user_id for update;
  v_now:=clock_timestamp();
  v_day:=(v_now at time zone 'Asia/Seoul')::date;
  select live_allowed into v_live from public.bnc_runtime where singleton=true;

  if p_operation='settings' then return to_jsonb(s)||jsonb_build_object('live_allowed',coalesce(v_live,false)); end if;
  if p_operation='list' then
    return (select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from
      (select * from public.bnc_jobs where user_id=p_user_id and expires_at>v_now order by created_at desc,id limit 50) x);
  end if;
  if p_operation='configure' then
    if coalesce((p_payload->>'enabled')::boolean,false) and not coalesce(v_live,false) then raise exception 'BNC_LIVE_DISABLED'; end if;
    if coalesce((p_payload->>'enabled')::boolean,false) and exists
      (select 1 from public.bnc_jobs where user_id=p_user_id and state in ('armed','uncertain')) then raise exception 'BNC_UNCERTAIN'; end if;
    update public.bnc_settings set
      request_cap=coalesce((p_payload->>'request_cap')::integer,request_cap),
      like_cap=coalesce((p_payload->>'like_cap')::integer,like_cap),
      comment_cap=coalesce((p_payload->>'comment_cap')::integer,comment_cap),
      mode=coalesce(p_payload->>'mode',mode), enabled=coalesce((p_payload->>'enabled')::boolean,enabled),revision=revision+1
      where user_id=p_user_id returning * into s;
    return to_jsonb(s);
  end if;
  if p_operation='create' then
    select id,external_id into account from public.member_platform_accounts
      where id=(p_payload->>'account_id')::uuid and user_id=p_user_id and platform='naver_blog';
    if not found or account.external_id !~ '^[a-z0-9_-]+$' then raise exception 'BNC_ACCOUNT_REQUIRED'; end if;
    insert into public.bnc_jobs(user_id,account_id,actor_id,neighbor_id,post_id,kind,body,created_at,expires_at)
      values(p_user_id,account.id,account.external_id,p_payload->>'neighbor_id',coalesce(p_payload->>'post_id',''),
        p_payload->>'kind',coalesce(p_payload->>'body',''),v_now,v_now+interval '720 hours') returning * into j;
    return to_jsonb(j);
  end if;

  v_job_id:=(p_payload->>'id')::uuid;
  select * into j from public.bnc_jobs where id=v_job_id and user_id=p_user_id for update;
  if not found then raise exception 'BNC_NOT_FOUND'; end if;
  if p_operation='result' then
    if j.generation is distinct from (p_payload->>'generation')::bigint or
      j.device_id is distinct from (p_payload->>'device_id')::uuid then raise exception 'BNC_STALE_CLAIM'; end if;
    if j.state='succeeded' then
      if p_payload->>'outcome'<>'success' then raise exception 'BNC_TERMINAL'; end if;
      return to_jsonb(j);
    end if;
    if j.state not in ('armed','uncertain') then raise exception 'BNC_INVALID_STATE'; end if;
    if p_payload->>'outcome'='success' and coalesce((p_payload->>'verified')::boolean,false) then
      update public.bnc_daily set reserved=reserved-1,succeeded=succeeded+1
        where user_id=p_user_id and day=j.claim_day and kind=j.budget_kind and reserved>0;
      if not found then raise exception 'BNC_COUNTER_MISMATCH'; end if;
      update public.bnc_jobs set state='succeeded',reserved=false where id=j.id and user_id=p_user_id returning * into j;
      if j.kind='request' then
        insert into public.bnc_neighbors values(p_user_id,j.account_id,j.neighbor_id,'pending',v_now)
          on conflict(user_id,account_id,neighbor_id) do update set state='pending',verified_at=excluded.verified_at;
      end if;
    elsif p_payload->>'outcome'='no_effect' and coalesce((p_payload->>'verified')::boolean,false) and j.state='armed' then
      perform bnc_private.release_reservation(p_user_id,j.id);
      update public.bnc_jobs set state='failed_no_effect' where id=j.id and user_id=p_user_id returning * into j;
    else
      update public.bnc_jobs set state='uncertain' where id=j.id and user_id=p_user_id returning * into j;
      update public.bnc_settings set enabled=false,revision=revision+1 where user_id=p_user_id;
    end if;
    return to_jsonb(j);
  end if;
  if j.expires_at<=v_now then raise exception 'BNC_EXPIRED'; end if;
  if p_operation in ('edit','approve') then
    if j.state not in ('draft','ready') then raise exception 'BNC_INVALID_STATE'; end if;
    if p_operation='edit' then
      update public.bnc_jobs set body=p_payload->>'body',state='draft',approval_hash=null,approval_revision=null
        where id=j.id and user_id=p_user_id returning * into j;
    else
      v_hash:=encode(sha256(convert_to(j.body,'UTF8')),'hex');
      update public.bnc_jobs set state='ready',approval_hash=v_hash,approval_revision=s.revision
        where id=j.id and user_id=p_user_id returning * into j;
    end if;
    return to_jsonb(j);
  end if;
  -- 관찰·선점·등록허가는 서비스 전용이며 회원 HTTP API에서 노출하지 않는다.
  if p_operation='observe' then
    insert into public.bnc_neighbors values(p_user_id,j.account_id,j.neighbor_id,p_payload->>'relationship',v_now)
      on conflict(user_id,account_id,neighbor_id) do update set state=excluded.state,verified_at=excluded.verified_at;
    update public.bnc_jobs set like_state=(p_payload->>'liked')::boolean,observed_at=v_now
      where id=j.id and user_id=p_user_id returning * into j;
    return to_jsonb(j);
  end if;
  if p_operation not in ('claim','arm','verify_permit') then raise exception 'BNC_INVALID_OPERATION'; end if;
  if not coalesce(v_live,false) then raise exception 'BNC_LIVE_DISABLED'; end if;
  if not s.enabled then raise exception 'BNC_STOPPED'; end if;
  if j.approval_revision is distinct from s.revision or j.approval_hash is distinct from encode(sha256(convert_to(j.body,'UTF8')),'hex')
    then raise exception 'BNC_APPROVAL_CHANGED'; end if;
  if not exists(select 1 from public.member_platform_accounts where id=j.account_id and user_id=p_user_id
    and platform='naver_blog' and external_id=j.actor_id) then raise exception 'BNC_ACCOUNT_REQUIRED'; end if;
  if j.kind<>'request' and not exists(select 1 from public.bnc_neighbors where user_id=p_user_id and account_id=j.account_id
    and neighbor_id=j.neighbor_id and state='mutual' and verified_at>v_now-interval '5 minutes') then raise exception 'BNC_NOT_MUTUAL'; end if;
  if j.kind='request' and exists(select 1 from public.bnc_neighbors where user_id=p_user_id and account_id=j.account_id
    and neighbor_id=j.neighbor_id and state in ('mutual','pending')) then raise exception 'BNC_ALREADY_RELATED'; end if;
  v_cap:=case j.budget_kind when 'request' then s.request_cap when 'like' then s.like_cap else s.comment_cap end;
  v_device:=(p_payload->>'device_id')::uuid;
  if v_device is null then raise exception 'BNC_INVALID_INPUT'; end if;

  if p_operation='claim' then
    -- 등록허가 전 만료된 선점만 회수한다. armed/uncertain은 시간이 지나도 회수하지 않는다.
    for v_expired in select id from public.bnc_jobs where user_id=p_user_id and state='claimed'
      and (lease_until<=v_now or claim_day<>v_day) order by id for update loop
      perform bnc_private.release_reservation(p_user_id,v_expired.id);
      update public.bnc_jobs set state='ready' where user_id=p_user_id and id=v_expired.id;
    end loop;
    select * into strict j from public.bnc_jobs where id=j.id and user_id=p_user_id for update;
    if j.state in ('armed','uncertain') then raise exception 'BNC_UNCERTAIN'; end if;
    if j.state<>'ready' then raise exception 'BNC_INVALID_STATE'; end if;
    insert into public.bnc_daily(user_id,day,kind) values(p_user_id,v_day,j.budget_kind) on conflict do nothing;
    select reserved+succeeded into v_count from public.bnc_daily where user_id=p_user_id and day=v_day and kind=j.budget_kind for update;
    if v_count>=v_cap then raise exception 'BNC_DAILY_CAP'; end if;
    if j.budget_kind='comment' then
      insert into public.bnc_comment_slots values(p_user_id,j.neighbor_id,v_day,j.id) on conflict do nothing;
      if not found then raise exception 'BNC_NEIGHBOR_CAP'; end if;
    end if;
    update public.bnc_daily set reserved=reserved+1 where user_id=p_user_id and day=v_day and kind=j.budget_kind;
    update public.bnc_jobs set state='claimed',device_id=v_device,generation=generation+1,claim_day=v_day,
      lease_until=v_now+interval '60 seconds',reserved=true where id=j.id and user_id=p_user_id returning * into j;
    return to_jsonb(j);
  end if;

  if j.generation is distinct from (p_payload->>'generation')::bigint or j.device_id is distinct from v_device then raise exception 'BNC_STALE_CLAIM'; end if;
  if p_operation='verify_permit' then
    if j.state<>'armed' then raise exception 'BNC_INVALID_STATE'; end if;
    if j.claim_day<>v_day then raise exception 'BNC_DAY_CHANGED'; end if;
    if j.permit_until is null or j.permit_until<=v_now then raise exception 'BNC_PERMIT_EXPIRED'; end if;
    return jsonb_build_object('valid',true,'id',j.id,'permit_until',j.permit_until);
  end if;
  if j.state<>'claimed' then raise exception 'BNC_INVALID_STATE'; end if;
  if j.claim_day<>v_day then raise exception 'BNC_DAY_CHANGED'; end if;
  if j.lease_until<=v_now then raise exception 'BNC_CLAIM_EXPIRED'; end if;
  select reserved+succeeded into v_count from public.bnc_daily where user_id=p_user_id and day=j.claim_day and kind=j.budget_kind;
  if v_count>v_cap then raise exception 'BNC_DAILY_CAP'; end if;
  if j.kind='like' and (j.like_state is distinct from false or j.observed_at is null or j.observed_at<=v_now-interval '5 minutes') then
    perform bnc_private.release_reservation(p_user_id,j.id);
    update public.bnc_jobs set state='skipped' where id=j.id and user_id=p_user_id returning * into j;
  else
    update public.bnc_jobs set state='armed',permit_until=least(v_now+interval '30 seconds',
      ((v_day+1)::timestamp at time zone 'Asia/Seoul')) where id=j.id and user_id=p_user_id returning * into j;
  end if;
  return to_jsonb(j);
end $$;
revoke all on function public.bnc_dispatch(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_dispatch(uuid,text,jsonb) to service_role;

comment on function public.bnc_dispatch(uuid,text,jsonb) is
  'blog-neighbor-care: verified server only. Member HTTP endpoints must not expose observe/claim/arm/verify_permit/result. Live gate initially false.';
commit;
