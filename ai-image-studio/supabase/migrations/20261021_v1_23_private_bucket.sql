-- v1.23 (2026-10-21) 생성 이미지 저장소 비공개 전환 — 주소만 알면 누구나 열 수 있던 문제 보강(주인님 결정).
-- 코드(v1.23)는 기록에 파일 경로(image_path)를 남기고 화면에는 서명 주소(24시간)만 준다. 옛 기록은 공개 주소에서 경로를 꺼낸다.
-- 30일 지난 기록·파일 정리는 /api/cron/cleanup(Vercel cron, CRON_SECRET)으로 옮겼다.
-- 적용 순서: v1.23 배포 Ready 확인 → 아래 실행.
update storage.buckets set public = false where id = 'ai-image-generations';
update public.programs set version = 'v1.23', updated_at = now() where slug = 'ai-image-studio';
