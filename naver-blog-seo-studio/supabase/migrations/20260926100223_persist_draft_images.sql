alter table public.naver_blog_seo_drafts
  add column if not exists image_path text,
  add column if not exists image_model text,
  add column if not exists image_mime_type text,
  add column if not exists image_created_at timestamptz;

insert into storage.buckets (id, name, public)
values ('naver-blog-seo-images', 'naver-blog-seo-images', false)
on conflict (id) do nothing;

drop policy if exists "seo draft images owner select" on storage.objects;
create policy "seo draft images owner select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'naver-blog-seo-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "seo draft images owner insert" on storage.objects;
create policy "seo draft images owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'naver-blog-seo-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "seo draft images owner delete" on storage.objects;
create policy "seo draft images owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'naver-blog-seo-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
