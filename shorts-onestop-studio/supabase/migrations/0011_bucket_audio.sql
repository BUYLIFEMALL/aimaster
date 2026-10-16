-- 2026-10-16 P5: 내레이션(TTS)·배경음악 파일도 같은 비공개 버킷 회원 폴더에 저장(<user_id>/voice/, <user_id>/bgm/). 장당 10MB 유지.
update storage.buckets set allowed_mime_types = array['image/png','image/jpeg','image/webp','audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/mp4','audio/x-m4a','audio/aac','audio/ogg']
where id = 'shorts-onestop-studio';
