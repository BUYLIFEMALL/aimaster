-- 답글 생성에 쓸 OpenAI 모델을 사용자가 고를 수 있게 한다(lib/ai/models.ts 참고).
alter table public.ytreply_settings
  add column reply_model text not null default 'gpt-5.6-luna';
