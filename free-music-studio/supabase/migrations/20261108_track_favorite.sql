-- AI 무료음악 자동화 — 곡 즐겨찾기(2026-11-08 주인님 「즐겨찾기 기능을 만들어줘」「곡마다 찾기가 힘들어」).
-- 다른 프로그램(blog-keyword·banana-canvas·reverse-prompt)과 같은 favorite 칸 하나. 즐겨찾기한 곡 기록은 30일 자동 정리에서 뺀다
-- (blog-keyword 0004 주인님 결정 「즐겨찾기는 용량 많이 잡아 먹는게 아니잖아 놔두는 걸로 하자」와 같은 규칙, /api/cron/cleanup). 음원 파일은 원래 회원 PC에만 있다.
alter table public.free_music_tracks
  add column if not exists favorite boolean not null default false;
