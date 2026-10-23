-- 인스타그램 자동 포스팅 관리 웹 - 게시글 이미지 업로드용 Storage 버킷
-- Supabase 대시보드 SQL Editor 또는 `supabase db push`로 실행하세요.

-- Instagram Graph API가 게시 시 이미지를 가져갈 수 있어야 하므로 버킷은 public read로 설정합니다.
insert into storage.buckets (id, name, public)
values ('insta-post-images', 'insta-post-images', true)
on conflict (id) do nothing;

-- 업로드 경로는 "{auth.uid()}/파일명" 형식만 허용해 본인 폴더에만 쓰기/삭제할 수 있게 제한합니다.
create policy "insta_post_images_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'insta-post-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "insta_post_images_update_own"
  on storage.objects for update
  using (
    bucket_id = 'insta-post-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "insta_post_images_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'insta-post-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 버킷이 public이라 URL로 직접 접근 가능하지만, 대시보드/API를 통한 select 조회도 허용합니다.
create policy "insta_post_images_select_public"
  on storage.objects for select
  using (bucket_id = 'insta-post-images');
