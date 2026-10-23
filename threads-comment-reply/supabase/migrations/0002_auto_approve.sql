-- (선택, 고급) 자동 게시 — 켜면 새 댓글에 대해 사람 검토 없이 AI 초안을 바로 게시한다.
-- 기본값 false. youtube-auto-reply의 ytreply_settings.auto_approve와 동일한 패턴.
alter table public.th_settings add column if not exists auto_approve boolean not null default false;
