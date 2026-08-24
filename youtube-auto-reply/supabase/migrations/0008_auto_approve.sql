-- (선택) 자동 게시 — 사용자가 설정에서 명시적으로 켠 경우에만, 검토 없이 AI 초안을 바로
-- 게시한다(AGENTS.md 7번 규칙). 기본값은 반드시 false.
alter table ytreply_settings
  add column if not exists auto_approve boolean not null default false;
