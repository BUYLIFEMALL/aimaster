-- 2026-10-21 v1.13 UI Canvas 보내기 때 회원 이미지 소스 키로 실제 사진 (운영 DB esgxyikcnnvmlhygjkth, 적용 완료). 표 변경 없음.
update public.programs set version = 'v1.13', updated_at = now() where slug = 'landing-architect';
