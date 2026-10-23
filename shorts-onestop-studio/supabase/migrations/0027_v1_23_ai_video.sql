-- v1.23 (2026-10-22): AI 동영상 장면 — 비공개 버킷에 mp4를 받도록 형식 추가, 파일당 10MB → 30MB(1080p 영상 대비, 이미지·음성 크기 제한은 코드에서 그대로).
-- 회원 폴더 <user_id>/video/ 아래 저장, 30일 지난 영상은 /api/cron/cleanup-videos(Vercel cron 매일 03:30 KST)가 지운다. 표 구조 변경 없음.
update storage.buckets
set file_size_limit = 31457280,
    allowed_mime_types = array['image/png','image/jpeg','image/webp','audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/mp4','audio/x-m4a','audio/aac','audio/ogg','video/mp4']
where id = 'shorts-onestop-studio';
update public.programs set version='v1.23', updated_at=now() where slug='shorts-onestop-studio';
