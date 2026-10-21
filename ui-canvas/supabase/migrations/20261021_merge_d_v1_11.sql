-- 2026-10-21 병합 D(주인님 승인): AI 웹 UI 제작 자동화(ai-web-ui) → UI Canvas 「🧩 컴포넌트 갤러리」. 서비스 키 REST로 적용, 기록용.
-- 백업(적용 전): 저장소 밖 D:\Antigravity\AIMaster_backup\merge-d-20261021\ (programs.json, access_ai_web_ui.json, access_ui_canvas.json)
-- 1) 권한 합치기: AI 웹 UI 권한 175명 중 UI Canvas 권한이 없던 32명은 모두 골드(드림팀) 등급 자동 부여분이었다.
--    주인님 결정(2026-10-21): 골드 등급 표에 UI Canvas를 체크 → 트리거 grade_program_access_sync가 골드 회원 전원에게 180일 자동 부여(143 → 175명).
insert into public.grade_program_access (grade_id, program_id, can_access)
select g.id, p.id, true from public.member_grades g, public.programs p
where g.name like '골드%' and p.slug = 'ui-canvas'
on conflict do nothing;
-- 2) 버전·카탈로그
update public.programs set version = 'v1.11', updated_at = now() where slug = 'ui-canvas';
update public.programs set version = 'v1.06', is_active = false, updated_at = now() where slug = 'ai-web-ui';
-- 3) ui-canvas 상세 소개(🧱 갤러리 단락·📤 React 코드)·한 줄 요약·핵심 특징 3·4번·사용 순서 4번은 관리자 화면과 같은 값으로 REST 갱신(이전 값은 위 백업 programs.json).
