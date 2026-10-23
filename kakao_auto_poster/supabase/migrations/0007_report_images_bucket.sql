-- 리포트 수정 화면에 이미지 삽입 기능을 추가하면서 필요해진 전용 Storage 버킷.
-- post-images(blog)/insta-post-images(insta_auto_poster)와 동일한 패턴 — 각
-- 서브프로젝트가 자기 콘텐츠용 공개 버킷을 하나씩 따로 둔다. 폴더 규칙은
-- "{user_id}/파일명"이라 본인 폴더에만 쓰기/수정/삭제할 수 있고, 읽기는 공개(리포트에
-- 삽입된 이미지를 카카오톡/이메일 등 외부에서도 볼 수 있어야 하므로).
insert into storage.buckets (id, name, public)
values ('kakao-report-images', 'kakao-report-images', true)
on conflict (id) do nothing;

create policy "kakao_report_images_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'kakao-report-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "kakao_report_images_update_own"
  on storage.objects for update
  using (bucket_id = 'kakao-report-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "kakao_report_images_delete_own"
  on storage.objects for delete
  using (bucket_id = 'kakao-report-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "kakao_report_images_select_public"
  on storage.objects for select
  using (bucket_id = 'kakao-report-images');
