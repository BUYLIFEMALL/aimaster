-- v1.23 (2026-10-21) 원본 이미지 저장소 비공개 전환 — 주소만 알면 누구나 열 수 있던 문제 보강(주인님 결정).
-- 코드(v1.23)는 DB의 image_path로 서명 주소(6시간)를 만들어 화면에 준다.
-- 분석 기록·원본 30일(생성일 기준) 정리는 /api/cron/cleanup(Vercel cron, CRON_SECRET).
-- 적용 순서: v1.23 배포 Ready 확인 → 아래 실행.
update storage.buckets set public = false where id = 'style-dna-images';
update public.programs set version = 'v1.23', updated_at = now() where slug = 'style-dna-analyzer';
