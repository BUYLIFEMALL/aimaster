-- 2026-09-14: 검사 결과 화면에서 자동 생성된 캐릭터 이미지를 카카오톡 공유/링크 미리보기에
-- 그대로 쓸 수 있으려면 공개 URL이 필요하다(base64 데이터 URL은 Kakao Share나 og:image로
-- 못 씀). instagram-comment-reply의 ig-media-thumbnails 버킷과 동일한 패턴 —
-- (storage.foldername(name))[1] = auth.uid() 로 회원별 폴더를 격리하고, 조회는 공개로 둔다.
insert into storage.buckets (id, name, public)
values ('mbti-character-images', 'mbti-character-images', true)
on conflict (id) do nothing;

create policy "mbti_character_images_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'mbti-character-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "mbti_character_images_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'mbti-character-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "mbti_character_images_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'mbti-character-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "mbti_character_images_select_public" on storage.objects
  for select to public
  using (bucket_id = 'mbti-character-images');
