-- 2026-10-16 v1.03: 로그인 + 공통 이용 권한 판정 적용(FREE 배지면 가입 회원 누구나, 끄면 구독·등급+사용기간). 운영 DB 적용 완료.
update public.programs set version = 'v1.03', updated_at = now() where slug = 'personality-code';
