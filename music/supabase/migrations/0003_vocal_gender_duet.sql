-- "남녀혼성 듀엣" 옵션 지원: vocal_gender에 '혼성' 값을 추가한다.
-- 이 값이 선택되면 lib/ai/musicPrompts.ts의 스타일/가사 생성 프롬프트가 듀엣용 지시문
-- (남녀 보컬이 구간을 나눠 부르도록 [Male Vocal]/[Female Vocal] 태그를 가사에 넣는 방식)으로
-- 바뀐다. Suno API 자체에는 duet을 지정하는 공식 파라미터가 없어서(docs.sunoapi.org 확인,
-- vocalGender는 m/f 단일 선택만 지원), 가사(prompt) 텍스트 안에 구간별 태그를 넣는 방식으로
-- 우회한다.
alter table public.music_plannings
  drop constraint music_plannings_vocal_gender_check;

alter table public.music_plannings
  add constraint music_plannings_vocal_gender_check
  check (vocal_gender in ('여성','남성','혼성'));
