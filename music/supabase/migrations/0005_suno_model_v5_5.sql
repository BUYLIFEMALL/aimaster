-- Suno 기본 모델을 V4_5 -> V5_5(최신)로 올린다. 코드(lib/ai/suno.ts DEFAULT_SUNO_MODEL)가 항상
-- 명시적으로 값을 넣어서 insert하므로 이 컬럼 default는 실사용에 영향은 없지만, 코드와 DB
-- 스키마 기본값을 어긋나지 않게 맞춰둔다.
alter table public.music_tracks alter column suno_model set default 'V5_5';
