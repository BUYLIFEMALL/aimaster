-- 2026-10-20 v1.26: 회원 연동 정보 공용 저장 ④단계 Instagram — 루트 docs/MEMBER_INTEGRATIONS.md
-- 표 구조 변경 없음, 백필 없음(자기 연결 표가 없음). Instagram 계정을 공용 표 먼저 → 없으면 insta_accounts로 읽는다.
update public.programs set version = 'v1.26', updated_at = now() where slug = 'cardnews-studio';
