-- 이메일 초안 생성 시 핵심 주제를 반영한 이미지를 함께 만들 수 있도록 컬럼과 저장 버킷을 추가한다
-- (blog의 generateArticleBasedImagePrompts + Gemini NanoBanana 이미지 생성 패턴을 참고).
alter table public.stepmail_email_drafts add column image_url text;

insert into storage.buckets (id, name, public)
values ('stepmail-images', 'stepmail-images', true)
on conflict (id) do nothing;

-- 업로드 경로를 `${auth.uid()}/...`로 강제해 본인 파일만 쓰기/삭제 가능하게 한다 (music-audio 버킷과 동일 패턴).
create policy "stepmail_images_insert_own" on storage.objects for insert
  with check (bucket_id = 'stepmail-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "stepmail_images_update_own" on storage.objects for update
  using (bucket_id = 'stepmail-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "stepmail_images_delete_own" on storage.objects for delete
  using (bucket_id = 'stepmail-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "stepmail_images_select_public" on storage.objects for select
  using (bucket_id = 'stepmail-images');
