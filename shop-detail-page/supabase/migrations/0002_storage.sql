-- 상품 원본이미지 + 생성된 섹션이미지/병합이미지를 담을 공개 버킷.
-- Gemini/Instagram류 외부 API가 URL로 직접 fetch해야 하므로 public=true (다른 서브프로젝트와 동일 패턴).
insert into storage.buckets (id, name, public)
values ('shop-detail-images', 'shop-detail-images', true)
on conflict (id) do nothing;

-- 업로드 경로를 `${auth.uid()}/...`로 강제해 본인 파일만 쓰기/삭제 가능하게 한다.
create policy "shop_detail_images_insert_own" on storage.objects for insert
  with check (bucket_id = 'shop-detail-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "shop_detail_images_update_own" on storage.objects for update
  using (bucket_id = 'shop-detail-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "shop_detail_images_delete_own" on storage.objects for delete
  using (bucket_id = 'shop-detail-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "shop_detail_images_select_public" on storage.objects for select
  using (bucket_id = 'shop-detail-images');
