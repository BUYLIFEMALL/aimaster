-- v1.24 (2026-10-21) 「브라우저에서 만들기(무료)」 완성 MP4 저장 버킷 — 주인님 승인(엔진 공유 2번 플랜 §3).
-- 공개 읽기(유튜브·인스타 게시가 공개 영상 주소를 씀), 1개 최대 50MB(프로젝트 전체 한도가 100MB를 막음 — 2026-10-21 확인), mp4만. 경로 `<회원 id>/<영상 id>/<시각>.mp4`.
-- 업로드는 서버가 발급한 일회용 서명 업로드 주소로만(createSignedUploadUrl), 삭제는 서버(관리자 키)가 회원 폴더 확인 후 처리 →
-- storage.objects에 회원용 쓰기 정책을 따로 두지 않는다(익명·다른 회원은 올리거나 지울 수 없음).
-- 30일 지난 파일은 shots /api/cron/cleanup-videos가 매일 지운다. 2026-10-21 Storage API(서비스 키)로 적용.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shots-videos', 'shots-videos', true, 52428800, array['video/mp4'])
on conflict (id) do nothing;
-- 버전
update public.programs set version='v1.24', updated_at=now() where slug='auto-shorts-posting';
