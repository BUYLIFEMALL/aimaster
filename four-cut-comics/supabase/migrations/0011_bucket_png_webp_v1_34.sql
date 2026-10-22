-- v1.34 (2026-10-22): 이미지 변환 스튜디오 「4컷 보관함에 다시 저장」(그림만 있는 작품, PNG·WebP 포함)을 위해 버킷 허용 형식 확대.
-- 비공개·크기 한도 5MB는 그대로. 2026-10-22 운영(ref esgxyikcnnvmlhygjkth)에 Storage API updateBucket으로 적용.
update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/json']
 where id = 'four-cut-comics-files';
