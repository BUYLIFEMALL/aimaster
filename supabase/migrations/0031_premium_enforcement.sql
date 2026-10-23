-- 프리미엄 프로그램 강제(2026-10-12 주인님 지시): "프리미엄" 뱃지를 다는 순간 그 프로그램의 무료 사용권한(user_program_access)이 효력을 잃고,
-- 사용자가 월결제(구독)를 해야만 쓸 수 있다. 이미 부여된 권한도 같은 기준으로 처리하고, 뱃지를 떼면 원래 기간으로 복원한다.
-- 정책 상세: docs/GRADE_AND_BILLING_POLICY.md
--
-- 동작
--  1) 프로그램에 'premium' 뱃지를 달면(INSERT/UPDATE):
--     - 'free' 뱃지는 자동으로 뗀다(FREE 가 있으면 판정에서 무조건 열리므로 프리미엄과 양립할 수 없다).
--     - 등급 미지정(required_grade_id NULL)이면 "일반" 등급으로 채운다(미지정이면 로그인만 해도 열리는 판정 규칙 때문).
--     - 이미 부여된 user_program_access 의 만료일을 과거로 만들어 효력을 없애고, 원래 만료일은 premium_prev_expires_at 에 보관한다.
--  2) 프리미엄 프로그램에 새로 부여하거나 만료일을 고치는 모든 시도(관리자 화면·스크립트 포함)는 같은 방식으로 효력이 없어진다.
--  3) 'premium' 뱃지를 떼면 보관해 둔 원래 만료일로 복원한다.
--  결제 구독(subscriptions)과 관리자는 영향이 없다. 각 프로그램의 판정 코드는 수정할 필요가 없다(만료일이 과거라 기존 판정이 막는다).

ALTER TABLE public.user_program_access
  ADD COLUMN IF NOT EXISTS premium_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_prev_expires_at timestamptz;

COMMENT ON COLUMN public.user_program_access.premium_suspended IS '프리미엄 프로그램이라 이 무료 부여는 효력이 정지됨(결제 필요). expires_at 은 과거로 바뀌고 원래 값은 premium_prev_expires_at.';
COMMENT ON COLUMN public.user_program_access.premium_prev_expires_at IS '프리미엄 정지 전 원래 만료일(NULL=무기한). 뱃지를 떼면 이 값으로 복원한다.';

-- 프로그램 뱃지 변경: 프리미엄 지정/해제 처리
CREATE OR REPLACE FUNCTION public.programs_premium_badge()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_new_premium boolean := 'premium' = ANY (COALESCE(NEW.badges, ARRAY[]::text[]));
  v_old_premium boolean := (TG_OP = 'UPDATE') AND ('premium' = ANY (COALESCE(OLD.badges, ARRAY[]::text[])));
BEGIN
  IF v_new_premium THEN
    -- FREE 와 양립 불가, 등급 미지정이면 일반 등급
    NEW.badges := array_remove(NEW.badges, 'free');
    IF NEW.required_grade_id IS NULL THEN
      SELECT id INTO NEW.required_grade_id FROM public.member_grades ORDER BY sort_order ASC LIMIT 1;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    PERFORM set_config('app.premium_internal', '1', true);
    IF v_new_premium AND NOT v_old_premium THEN
      UPDATE public.user_program_access
         SET premium_prev_expires_at = expires_at,
             premium_suspended = true,
             expires_at = now() - interval '1 second'
       WHERE program_id = NEW.id AND premium_suspended = false;
    ELSIF v_old_premium AND NOT v_new_premium THEN
      UPDATE public.user_program_access
         SET expires_at = premium_prev_expires_at,
             premium_prev_expires_at = NULL,
             premium_suspended = false
       WHERE program_id = NEW.id AND premium_suspended = true;
    END IF;
    PERFORM set_config('app.premium_internal', '0', true);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS programs_premium_badge ON public.programs;
CREATE TRIGGER programs_premium_badge
  BEFORE INSERT OR UPDATE OF badges ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.programs_premium_badge();

-- 프리미엄 프로그램에 새로 부여하거나 만료일·대상 프로그램을 고치면 즉시 효력을 없앤다
CREATE OR REPLACE FUNCTION public.user_program_access_premium_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF COALESCE(current_setting('app.premium_internal', true), '0') = '1' THEN
    RETURN NEW;
  END IF;
  IF NEW.program_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.programs p WHERE p.id = NEW.program_id AND 'premium' = ANY (COALESCE(p.badges, ARRAY[]::text[]))
  ) THEN
    NEW.premium_prev_expires_at := NEW.expires_at;
    NEW.premium_suspended := true;
    NEW.expires_at := now() - interval '1 second';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS user_program_access_premium_guard ON public.user_program_access;
CREATE TRIGGER user_program_access_premium_guard
  BEFORE INSERT OR UPDATE OF expires_at, program_id ON public.user_program_access
  FOR EACH ROW EXECUTE FUNCTION public.user_program_access_premium_guard();
