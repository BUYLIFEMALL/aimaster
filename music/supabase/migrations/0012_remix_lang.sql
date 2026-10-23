-- 리믹스에도 곡 기획(music_plannings.lang)과 동일하게 언어를 선택할 수 있게 한다. 지금까지는
-- 가사를 안 넣으면 영어 기본 지시문("Sing this song in the new style...")을 그대로 보내서
-- 보컬이 영어로 나오는 경향이 있었다 — 이제 사용자가 고른 언어를 지시문에 명시한다.
alter table public.music_track_remixes
  add column lang text not null default '한국어';
