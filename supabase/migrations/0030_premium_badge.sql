-- 프리미엄 뱃지 추가(2026-10-12 주인님 지시): 운영자에게 서버·트래픽 실비가 나가는 프로그램에 "💎 프리미엄" 뱃지를 달면
-- 프로그램 소개 페이지에 "골드·VIP도 월 사용료 필요" 안내가 자동 표시되고, 뱃지를 떼면 안내도 사라진다.
-- 정책 상세: docs/GRADE_AND_BILLING_POLICY.md. (이 migration 은 뱃지 허용값만 늘린다. 프리미엄 지정·권한 무효화는 별도 작업.)
ALTER TABLE public.programs DROP CONSTRAINT IF EXISTS programs_badges_check;
ALTER TABLE public.programs
  ADD CONSTRAINT programs_badges_check
  CHECK (badges <@ ARRAY['new'::text, 'best'::text, 'sale'::text, 'coming'::text, 'free'::text, 'recommended'::text, 'premium'::text]);
