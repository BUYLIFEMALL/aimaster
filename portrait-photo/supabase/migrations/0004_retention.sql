-- AI 인물사진 자동화 (slug: portrait-photo) — v1.04 서버 보관함 보관 기간 (2026-10-14)
-- 저장할 때 회원이 고른 보관 기간(7·30·90일, 0=직접 삭제할 때까지)으로 만료 시각을 기록한다.
-- 만료된 사진은 목록 조회·저장 때마다 서버가 저장소와 목록에서 지운다(별도 크론 없음).
alter table public.portrait_photo_saved add column if not exists expires_at timestamptz;
