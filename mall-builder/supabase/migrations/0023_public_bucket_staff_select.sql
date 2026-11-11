-- D7 사진 지우기가 오류 없이 0장으로 끝남 → 저장소 지우기(remove)는 지운 줄을 다시 읽어 돌려주므로 「읽기」 규칙도 있어야 한다
-- 그 몰 운영자가 자기 몰 폴더 파일 정보만 읽는다(손님 화면의 공개 주소 보기는 공개 버킷이라 이 규칙과 무관)
create policy "mall_builder_public_staff_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'mall-builder-public' and public.mall_builder_is_store_staff(((storage.foldername(name))[1])::uuid));
