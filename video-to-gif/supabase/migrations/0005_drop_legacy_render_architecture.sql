-- Render 워커 기반 아키텍처를 브라우저 처리(ffmpeg.wasm)로 전환하면서 더 이상
-- 쓰지 않는 테이블을 정리한다. Storage 버킷(videotogif-uploads, videotogif-results)도
-- 같은 이유로 대시보드에서 함께 삭제했다(버킷 삭제는 이 SQL 마이그레이션에 포함되지
-- 않음 — Supabase Storage API로 별도 처리).
drop table if exists public.videotogif_conversions;
