-- AI 블로그 콘텐츠 제작 자동화 v1.01. Approved by owner 2026-10-16.
create table public.blog_content_maker_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);
create table public.blog_content_maker_projects (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(title)<=200), brief jsonb not null default '{}'::jsonb,
 current_revision_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '30 days', unique(id,user_id)
);
create table public.blog_content_maker_revisions (
 id uuid primary key default gen_random_uuid(), project_id uuid not null, user_id uuid not null references auth.users(id) on delete cascade,
 version integer not null check(version>0), data jsonb not null, created_at timestamptz not null default now(),
 foreign key(project_id,user_id) references public.blog_content_maker_projects(id,user_id) on delete cascade,
 unique(id,project_id,user_id), unique(project_id,version)
);
alter table public.blog_content_maker_projects add constraint bcm_current_revision_owner
 foreign key(current_revision_id,id,user_id) references public.blog_content_maker_revisions(id,project_id,user_id) deferrable initially deferred;
create table public.blog_content_maker_assets (
 id uuid primary key default gen_random_uuid(), project_id uuid not null, user_id uuid not null references auth.users(id) on delete cascade,
 path text not null unique, mime text not null check(mime in ('image/png','image/jpeg','image/webp')),
 bytes integer not null check(bytes>0 and bytes<=10485760), alt text not null default '', prompt text not null default '',
 plan_id text not null default '', placement integer not null default 0 check(placement between 0 and 200), kind text not null default 'image',
 created_at timestamptz not null default now(),
 foreign key(project_id,user_id) references public.blog_content_maker_projects(id,user_id) on delete cascade,
 check(path like user_id::text||'/'||project_id::text||'/%')
);
create table public.blog_content_maker_jobs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 project_id uuid, request_key uuid not null, input_hash text not null, action text not null,
 status text not null default 'running' check(status in ('running','succeeded','failed','uncertain')),
 result jsonb, error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(project_id,user_id) references public.blog_content_maker_projects(id,user_id) on delete cascade,
 unique(user_id,request_key)
);
create unique index bcm_one_running_action on public.blog_content_maker_jobs(user_id,project_id,action) where status='running';
create table public.blog_content_maker_extension_tokens (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 token_hash text not null unique check(length(token_hash)=64), scope text not null default 'read-draft' check(scope='read-draft'),
 expires_at timestamptz not null default now()+interval '7 days', revoked_at timestamptz, created_at timestamptz not null default now()
);
create index bcm_projects_owner_updated on public.blog_content_maker_projects(user_id,updated_at desc);
create index bcm_revisions_owner_project on public.blog_content_maker_revisions(user_id,project_id,version desc);
create index bcm_assets_owner_project on public.blog_content_maker_assets(user_id,project_id);
create index bcm_jobs_owner_created on public.blog_content_maker_jobs(user_id,created_at desc);
create index bcm_tokens_owner on public.blog_content_maker_extension_tokens(user_id);

do $rls$ declare t text; begin
 foreach t in array array['settings','projects','revisions','assets','jobs','extension_tokens'] loop
  execute format('alter table public.blog_content_maker_%I enable row level security',t);
  execute format('revoke all on public.blog_content_maker_%I from anon',t);
  execute format('grant select,insert,update,delete on public.blog_content_maker_%I to authenticated,service_role',t);
  execute format('create policy owner_select on public.blog_content_maker_%I for select to authenticated using ((select auth.uid())=user_id)',t);
  execute format('create policy owner_insert on public.blog_content_maker_%I for insert to authenticated with check ((select auth.uid())=user_id)',t);
  execute format('create policy owner_update on public.blog_content_maker_%I for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
  execute format('create policy owner_delete on public.blog_content_maker_%I for delete to authenticated using ((select auth.uid())=user_id)',t);
 end loop;
end $rls$;

create function public.blog_content_maker_save_revision(p_user uuid,p_project uuid,p_expected uuid,p_data jsonb)
returns uuid language plpgsql security invoker set search_path=public as $$
declare current_id uuid; revision_id uuid; next_version integer;
begin
 select current_revision_id into current_id from public.blog_content_maker_projects where id=p_project and user_id=p_user and expires_at>now() for update;
 if not found then raise exception 'project_not_found'; end if;
 if current_id is distinct from p_expected then raise exception 'revision_conflict'; end if;
 if jsonb_typeof(p_data)<>'object' or length(p_data->>'title') not between 1 and 200 or length(p_data->>'body') not between 1 and 60000 then raise exception 'invalid_revision'; end if;
 select coalesce(max(version),0)+1 into next_version from public.blog_content_maker_revisions where project_id=p_project and user_id=p_user;
 insert into public.blog_content_maker_revisions(project_id,user_id,version,data) values(p_project,p_user,next_version,p_data) returning id into revision_id;
 update public.blog_content_maker_projects set current_revision_id=revision_id,title=p_data->>'title',updated_at=now() where id=p_project and user_id=p_user;
 return revision_id;
end $$;
revoke all on function public.blog_content_maker_save_revision(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.blog_content_maker_save_revision(uuid,uuid,uuid,jsonb) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('blog-content-maker','blog-content-maker',false,10485760,array['image/png','image/jpeg','image/webp']);
create policy bcm_asset_read on storage.objects for select to authenticated using(bucket_id='blog-content-maker' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy bcm_asset_insert on storage.objects for insert to authenticated with check(bucket_id='blog-content-maker' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy bcm_asset_update on storage.objects for update to authenticated using(bucket_id='blog-content-maker' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='blog-content-maker' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy bcm_asset_delete on storage.objects for delete to authenticated using(bucket_id='blog-content-maker' and (storage.foldername(name))[1]=(select auth.uid())::text);
