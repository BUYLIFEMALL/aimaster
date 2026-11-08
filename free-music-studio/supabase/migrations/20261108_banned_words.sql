-- AI 무료음악 자동화 — 금지어를 회원 계정에 저장(백로그 A-4, 2026-11-08 주인님 승인 「진행해」).
-- 예전에는 브라우저(localStorage fms.bannedWords)에만 있어 다른 PC·브라우저에서 사라졌다. 같은 설정 표(free_music_preferences)에 칸 하나.
-- 최대 30개·중복 없음은 서버(lib/lyricRules cleanBannedWords)가 맞춘다. 회원 설정이라 30일 삭제 대상 아님.
alter table public.free_music_preferences
  add column if not exists banned_words text[] not null default '{}';
