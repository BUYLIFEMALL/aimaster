-- v2.19 (2026-10-23) 쓰레드 콘텐츠 운영 전용 공개 미디어 버킷 — 주인님 결정(「전용 공개 버킷」).
-- 함께 쓰던 ai-image-generations가 2026-10-21 비공개로 바뀌어(AI 이미지 자동화 v1.23) 공개 주소가 깨지고 Threads가 사진을 못 가져가게 됐다.
-- 회원별 폴더(첫 폴더 = 회원 id)에만 올리기·삭제(브라우저 직접 업로드용). 읽기는 공개 주소(Threads·썸네일). 목록 조회 정책은 두지 않는다.
insert into storage.buckets (id, name, public) values ('threads-content-ops-media', 'threads-content-ops-media', true)
on conflict (id) do update set public = true;
drop policy if exists tco_media_insert_own on storage.objects;
create policy tco_media_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'threads-content-ops-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists tco_media_delete_own on storage.objects;
create policy tco_media_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'threads-content-ops-media' and (storage.foldername(name))[1] = auth.uid()::text);
