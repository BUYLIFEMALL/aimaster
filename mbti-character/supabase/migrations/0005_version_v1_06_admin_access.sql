-- 2026-10-16 v1.06: 권한 판정 테이블 조회를 서비스 롤로(원칙 6). 운영 DB 적용 완료.
update public.programs set version = 'v1.06', updated_at = now() where slug = 'mbti-character';
