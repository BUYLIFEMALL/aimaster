-- v2.12 (2026-10-23): 이미지 전용 공개 버킷. 예전 공용 버킷 ai-image-generations가 2026-10-21(AI 이미지 자동화 v1.23) 비공개로 바뀌어
-- 이 프로그램이 돌려주던 공개 주소가 400(Bucket not found)이 됐다. 업로드는 서버(서비스 키)만 하므로 storage 정책은 두지 않는다.
-- 옛 버킷의 naver-blog-agent/ 파일은 30일 정리(cron/cleanup)가 계속 지운다.
insert into storage.buckets (id, name, public) values ('naver-blog-agent-media', 'naver-blog-agent-media', true)
on conflict (id) do update set public = true;

update public.programs set version = 'v2.12', extension_version = 'v2.12', updated_at = now() where slug = 'naver-blog-agent';
