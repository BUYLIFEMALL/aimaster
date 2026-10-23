-- 2026-10-16: Pexels 새 API 키 발급 일시 중단 확인(주인님 화면) → Pexels 발급 매뉴얼 맨 위에 안내 추가(실제 적용은 MCP로 content 전체 갱신).
-- 프로그램은 기본 스톡을 Pixabay로 바꾸고 설정 화면에서 Pixabay를 먼저 보여 준다(src/lib/script.ts normalizeBackdrop, SettingsView).
update public.platform_guides set updated_at=now() where id='ff6c331e-74a8-4b00-99c9-3b91f44f41f7';
