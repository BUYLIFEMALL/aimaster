-- 게시물 썸네일을 인스타그램 CDN URL을 그대로 저장하지 않고 우리 Storage로 재호스팅하기 위한 버킷.
-- 원인: 인스타그램 Graph API가 내려주는 media_url/thumbnail_url은 서명이 걸린 임시 링크라
-- 시간이 지나면(또는 핫링크 방지 정책에 의해) 403을 반환한다 — 2026-09-13, /media 페이지에서
-- 모든 썸네일이 깨져 보이는 문제의 원인으로 확인됨. 동기화 시점에 서버에서 즉시 내려받아
-- 우리 Storage에 영구 저장한 뒤 그 공개 URL을 DB에 저장하는 방식으로 바꾼다.
insert into storage.buckets (id, name, public)
values ('ig-media-thumbnails', 'ig-media-thumbnails', true)
on conflict (id) do nothing;

-- 업로드 경로는 "{auth.uid()}/파일명" 형식만 허용해 본인 폴더에만 쓰기/삭제할 수 있게 제한합니다.
create policy "ig_media_thumbnails_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'ig-media-thumbnails'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "ig_media_thumbnails_update_own"
  on storage.objects for update
  using (
    bucket_id = 'ig-media-thumbnails'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "ig_media_thumbnails_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'ig-media-thumbnails'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "ig_media_thumbnails_select_public"
  on storage.objects for select
  using (bucket_id = 'ig-media-thumbnails');
