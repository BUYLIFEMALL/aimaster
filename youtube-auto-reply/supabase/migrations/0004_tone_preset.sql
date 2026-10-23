-- 답글 톤 기본 선택지(전문가적/친근한 톤 등). 값 자체는 AI 프롬프트에 넣을 지시문 텍스트를
-- 코드(lib/tonePresets.ts)에서 매핑하므로, DB에는 preset 키만 저장한다.
alter table public.ytreply_settings
  add column tone_preset text;
