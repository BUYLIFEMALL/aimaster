-- 결과 화면에서 AI가 생성한 카드 일러스트를 카카오톡 공유/링크 미리보기(og:image)에 그대로
-- 쓸 수 있으려면 공개 URL이 필요하다(base64 데이터 URL은 Kakao Share나 og:image로 못 씀).
-- mbti-character의 mbti-character-images 버킷과 동일한 패턴 —
-- (storage.foldername(name))[1] = auth.uid() 로 회원별 폴더를 격리하고, 조회는 공개로 둔다.
insert into storage.buckets (id, name, public)
values ('tarot-card-images', 'tarot-card-images', true)
on conflict (id) do nothing;

create policy "tarot_card_images_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'tarot-card-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "tarot_card_images_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'tarot-card-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "tarot_card_images_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'tarot-card-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "tarot_card_images_select_public" on storage.objects
  for select to public
  using (bucket_id = 'tarot-card-images');
