-- 트랙 카드에 "보컬버전(남성)"/"(여성)"/"(듀엣)"처럼 실제 생성 당시 보컬 성별을 표시하기 위해
-- music_tracks에도 vocal_gender를 스냅샷으로 저장한다. music_plannings.vocal_gender는 사용자가
-- 나중에 수정할 수 있어서(기획 수정 기능), 이미 생성된 트랙의 라벨이 그 수정에 따라 잘못
-- 바뀌지 않도록 트랙 생성 시점의 값을 트랙 자신에 따로 저장해둔다(style_description/
-- exclude_styles를 트랙마다 스냅샷하는 기존 패턴과 동일).
alter table public.music_tracks
  add column vocal_gender text check (vocal_gender in ('여성','남성','혼성'));
