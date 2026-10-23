-- 2026-10-20 v1.18: 회원 연동 정보 공용 저장 — Instagram 공용 계정 먼저 읽기(루트 docs/MEMBER_INTEGRATIONS.md, 카드뉴스 v1.26·인플루언서 v1.16과 같은 수정)
-- 표 구조 변경 없음, 백필 없음(자기 연결 표가 없음).
update public.programs set version = 'v1.18', updated_at = now() where slug = 'ai-webtoon-studio';
