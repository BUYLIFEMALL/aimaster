-- 2026-10-16 P4: AI 배경 이미지 비공개 버킷. 서버(서비스 롤)만 읽고 쓰며, 회원 폴더(<user_id>/)만 1시간 서명 주소로 보여 준다(src/lib/media.ts).
-- 정책을 두지 않아 일반 회원 키(anon/authenticated)로는 접근할 수 없다. 장당 10MB, 이미지 형식만.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shorts-onestop-studio', 'shorts-onestop-studio', false, 10485760, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
