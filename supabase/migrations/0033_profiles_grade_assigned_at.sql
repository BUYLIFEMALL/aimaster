-- 등급 지정일(2026-10-13 주인님 지시): 회원마다 가입·승급 시점이 달라, 골드 180일·VIP 365일 같은 기본 기간을 "등급이 지정된 날"부터 회원별로 계산한다.
--  - profiles.grade_assigned_at: 등급이 바뀔 때마다 DB 트리거가 now()로 자동 기록.
--  - 기존 회원 보정(2026-10-13 적용): 골드·VIP는 "가장 늦은 현재 만료일 − 기본 기간"(지금을 넘지 않게), 나머지는 가입일. 결과적으로 기존 골드·VIP 전원이 2026-10-12.
--  - 팝업의 "등급 지정일부터 기본 기간 적용"·"현재 만료일에서 연장" 모드는 /api/admin/user-access 가 사람마다 따로 계산한다.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade_assigned_at timestamptz;

UPDATE public.profiles p
   SET grade_assigned_at = LEAST(now(), COALESCE(
         (SELECT max(u.expires_at) FROM public.user_program_access u WHERE u.user_id = p.id AND u.expires_at IS NOT NULL)
           - make_interval(days => g.default_access_days),
         p.created_at))
  FROM public.member_grades g
 WHERE g.id = p.grade_id AND g.auto_grant AND g.default_access_days IS NOT NULL;
UPDATE public.profiles SET grade_assigned_at = created_at WHERE grade_assigned_at IS NULL;
ALTER TABLE public.profiles ALTER COLUMN grade_assigned_at SET DEFAULT now();

CREATE OR REPLACE FUNCTION public.profiles_grade_assigned_at_set()
 RETURNS trigger LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.grade_id IS DISTINCT FROM OLD.grade_id THEN NEW.grade_assigned_at := now(); END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS profiles_grade_assigned_at_set ON public.profiles;
CREATE TRIGGER profiles_grade_assigned_at_set BEFORE UPDATE OF grade_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_grade_assigned_at_set();
