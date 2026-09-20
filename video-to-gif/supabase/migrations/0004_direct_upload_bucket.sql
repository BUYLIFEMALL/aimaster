-- 브라우저가 Vercel 서버리스 함수(100MB 본문 제한)를 거치지 않고 Supabase Storage에
-- 직접 업로드할 수 있도록 전용 비공개 버킷을 추가한다. 결과물(videotogif-results)이
-- 이미 이 방식으로 워커 -> Storage 직접 업로드를 쓰고 있는 것과 대칭되는 구조다.
insert into storage.buckets (id, name, public)
values ('videotogif-uploads', 'videotogif-uploads', false)
on conflict (id) do nothing;

drop policy if exists "videotogif users can upload own input objects" on storage.objects;
create policy "videotogif users can upload own input objects"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'videotogif-uploads' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "videotogif users can read own input objects" on storage.objects;
create policy "videotogif users can read own input objects"
  on storage.objects for select to authenticated
  using (bucket_id = 'videotogif-uploads' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "videotogif users can delete own input objects" on storage.objects;
create policy "videotogif users can delete own input objects"
  on storage.objects for delete to authenticated
  using (bucket_id = 'videotogif-uploads' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- 원본이 어디 업로드됐는지(워커가 다운로드할 경로) 추적하는 컬럼.
alter table public.videotogif_conversions
  add column if not exists input_key text;
