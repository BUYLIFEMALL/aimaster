-- v1.15 (2026-10-21, 이커머스 병합 E0): 회원 상품 이미지 버킷을 비공개로 전환한다.
-- 예전(0002_storage.sql)에는 "외부 API가 URL로 가져가야 한다"는 이유로 public=true + 전체 읽기 정책이었으나,
-- 실제로는 Gemini에 이미지를 base64(inlineData)로 넣어 보내므로 공개 주소가 필요 없다.
-- 앱은 서버에서 세션 클라이언트로 download()하고, 화면은 /api/image가 본인 확인 후 서명 주소로 넘긴다.
-- DB에 저장된 기존 공개 주소 문자열은 그대로 두고 경로 식별자로만 쓴다(데이터 이전 없음).
-- 적용 대상: 운영 ① AIMaster, ref esgxyikcnnvmlhygjkth.

update storage.buckets set public = false where id = 'shop-detail-images';

drop policy if exists "shop_detail_images_select_public" on storage.objects;

create policy "shop_detail_images_select_own" on storage.objects for select
  using (bucket_id = 'shop-detail-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- 되돌리기(문제 시):
-- update storage.buckets set public = true where id = 'shop-detail-images';
-- drop policy if exists "shop_detail_images_select_own" on storage.objects;
-- create policy "shop_detail_images_select_public" on storage.objects for select using (bucket_id = 'shop-detail-images');
