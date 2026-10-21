-- 2026-10-21 병합 B: 페르소나 문체 자동화 → AI 글쓰기 에디터 「🎚️ 문체 바꾸기」 (운영 DB esgxyikcnnvmlhygjkth)
-- 실제 적용은 서비스 키 REST로 했다(행 백업: D:\Antigravity\AIMaster_backup\merge-b-20261021). 같은 내용을 SQL로 남긴다.
-- 새 표 없음: 나만의 페르소나는 기존 persona_style_personas(user_id + RLS)를 그대로 쓴다.

-- 1) 페르소나 권한 회원의 에디터 사용기간을 페르소나 기간까지 늘림(줄이지 않음) — 24건
update user_program_access e
set expires_at = p.expires_at
from user_program_access p
where e.program_id = (select id from programs where slug = 'ai-writing-editor')
  and p.program_id = (select id from programs where slug = 'persona-style-studio')
  and e.user_id = p.user_id
  and (case when p.expires_at is null then e.expires_at is not null else e.expires_at is not null and e.expires_at < p.expires_at end);

-- 2) 버전·숨김 (상세 소개·핵심 특징·사용 순서는 문체 바꾸기 내용을 넣어 함께 갱신)
update programs set version = 'v1.11', updated_at = now() where slug = 'ai-writing-editor';
update programs set version = 'v1.09', is_active = false, updated_at = now() where slug = 'persona-style-studio';
