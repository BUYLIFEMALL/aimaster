create table if not exists public.videotogif_conversions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null unique,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'error')),
  original_name text not null,
  original_size_bytes bigint not null check (original_size_bytes > 0),
  options_fps integer not null check (options_fps in (40, 50)),
  options_width integer not null check (options_width between 160 and 800),
  output_key text,
  output_url text,
  file_size_bytes bigint,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  progress_message text,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists videotogif_conversions_user_created_idx
  on public.videotogif_conversions (user_id, created_at desc);

alter table public.videotogif_conversions enable row level security;

drop policy if exists "videotogif owners can view jobs" on public.videotogif_conversions;
create policy "videotogif owners can view jobs"
  on public.videotogif_conversions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "videotogif owners can create jobs" on public.videotogif_conversions;
create policy "videotogif owners can create jobs"
  on public.videotogif_conversions for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "videotogif owners can update jobs" on public.videotogif_conversions;
create policy "videotogif owners can update jobs"
  on public.videotogif_conversions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "videotogif owners can delete jobs" on public.videotogif_conversions;
create policy "videotogif owners can delete jobs"
  on public.videotogif_conversions for delete to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('videotogif-results', 'videotogif-results', false)
on conflict (id) do nothing;

drop policy if exists "videotogif users can read own result objects" on storage.objects;
create policy "videotogif users can read own result objects"
  on storage.objects for select to authenticated
  using (bucket_id = 'videotogif-results' and (storage.foldername(name))[1] = (select auth.uid()::text));
