-- v1.20 (2026-10-21): MP4 만들기 소리 섞기·인코딩을 공용 기준 코드 browser-mp4-encoder(mp4Encoder.ts)로 분리 — 동작 같음(엔진 공유 2번)
update public.programs set version='v1.20', updated_at=now() where slug='shorts-onestop-studio';
