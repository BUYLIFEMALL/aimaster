-- Suno가 반환하는 오디오/커버이미지를 영구 보관할 공개 버킷.
-- 사용자가 직접 재생/다운로드해야 하므로 public=true (다른 서브프로젝트와 동일 패턴).
insert into storage.buckets (id, name, public)
values ('music-audio', 'music-audio', true)
on conflict (id) do nothing;

-- 업로드 경로를 `${auth.uid()}/...`로 강제해 본인 파일만 쓰기/삭제 가능하게 한다.
-- 단, Suno 웹훅 콜백(app/api/webhooks/suno/route.ts)은 로그인 세션이 없으므로
-- admin(service role) 클라이언트로 이 RLS 자체를 우회해서 업로드한다 — 이 정책은
-- 사용자가 직접 로그인한 상태에서 접근하는 경로에만 적용된다.
create policy "music_audio_insert_own" on storage.objects for insert
  with check (bucket_id = 'music-audio' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "music_audio_update_own" on storage.objects for update
  using (bucket_id = 'music-audio' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "music_audio_delete_own" on storage.objects for delete
  using (bucket_id = 'music-audio' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "music_audio_select_public" on storage.objects for select
  using (bucket_id = 'music-audio');
