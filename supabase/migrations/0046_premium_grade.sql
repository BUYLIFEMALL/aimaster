-- 프리미엄 등급 신설 (2026-10-29 주인님 지시): 프리미엄 배지 프로그램까지 포함한 「모든 프로그램」을 무료로 쓰는 최고 등급.
--  - 기본 사용기간 1년(365일), 전 프로그램 자동 부여(새로 추가되는 프로그램도 자동 포함).
--  - VIP(비프리미엄 전체 무료)보다 위. 기존 일반·실버·골드·VIP 로직은 그대로 두고, 이 등급만 분기로 특례 처리한다.
-- 설계 키: member_grades.grants_premium=true 인 등급(=프리미엄)만 ① 프리미엄 가드(0031)에서 부여 정지 제외,
--          ② 자동 부여(0032)를 grade_program_access 체크 대신 "모든 활성 프로그램"으로 받는다.
-- 정책 상세: docs/GRADE_AND_BILLING_POLICY.md · docs/ADMIN_POLICY_GUIDELINES.md
-- 판정 코드(lib/access/checkProgramAccess.ts·각 프로그램 lib/access.ts)는 수정하지 않는다 — 부여가 유효하게 유지되어 기존 "등급+부여" 판정으로 열린다.

-- 1) 플래그 컬럼
ALTER TABLE public.member_grades
  ADD COLUMN IF NOT EXISTS grants_premium boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.member_grades.grants_premium IS 'true면 프리미엄 배지 프로그램까지 포함한 모든 프로그램을 무료로 쓰는 등급(현재 프리미엄 등급). 자동 부여는 전 활성 프로그램, 프리미엄 가드 정지 제외.';

-- 2) 프리미엄 등급 추가(이미 있으면 건너뜀). sort_order 는 현재 최대값+1(VIP 위), 기본 1년.
INSERT INTO public.member_grades (name, slug, sort_order, auto_grant, default_access_days, grants_premium)
SELECT '프리미엄', 'premium', COALESCE((SELECT MAX(sort_order) FROM public.member_grades), 0) + 1, true, 365, true
WHERE NOT EXISTS (SELECT 1 FROM public.member_grades WHERE slug = 'premium' OR name = '프리미엄');

-- 3) 0031 프리미엄 가드 — 프리미엄 등급(grants_premium) 회원의 부여는 정지하지 않는다.
CREATE OR REPLACE FUNCTION public.user_program_access_premium_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF COALESCE(current_setting('app.premium_internal', true), '0') = '1' THEN
    RETURN NEW;
  END IF;
  -- 프리미엄 등급 회원이면 프리미엄 배지 프로그램이라도 부여를 그대로 둔다.
  IF EXISTS (
    SELECT 1 FROM public.profiles pr
      JOIN public.member_grades g ON g.id = pr.grade_id
     WHERE pr.id = NEW.user_id AND g.grants_premium
  ) THEN
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

-- 3-1) 프로그램에 프리미엄 배지를 새로 달 때의 일괄 정지 — 프리미엄 등급 회원 부여는 제외한다.
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
    NEW.badges := array_remove(NEW.badges, 'free');
    IF NEW.required_grade_id IS NULL THEN
      SELECT id INTO NEW.required_grade_id FROM public.member_grades ORDER BY sort_order ASC LIMIT 1;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    PERFORM set_config('app.premium_internal', '1', true);
    IF v_new_premium AND NOT v_old_premium THEN
      UPDATE public.user_program_access u
         SET premium_prev_expires_at = expires_at,
             premium_suspended = true,
             expires_at = now() - interval '1 second'
       WHERE u.program_id = NEW.id AND u.premium_suspended = false
         AND NOT EXISTS (
           SELECT 1 FROM public.profiles pr
             JOIN public.member_grades g ON g.id = pr.grade_id
            WHERE pr.id = u.user_id AND g.grants_premium
         );
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

-- 4) 0032 자동 부여 — 프리미엄 등급(grants_premium)은 grade_program_access 체크 대신 "모든 활성 프로그램"을 부여한다.
CREATE OR REPLACE FUNCTION public.apply_grade_programs(p_grade_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_days integer;
  v_auto boolean;
  v_premium boolean;
  v_count integer;
BEGIN
  SELECT auto_grant, default_access_days, grants_premium INTO v_auto, v_days, v_premium FROM member_grades WHERE id = p_grade_id;
  IF NOT COALESCE(v_auto, false) THEN RETURN 0; END IF;
  IF COALESCE(v_premium, false) THEN
    -- 프리미엄 등급: 모든 활성 프로그램(프리미엄 배지 포함)
    INSERT INTO user_program_access (user_id, program_id, expires_at, grant_source, granted_grade_id)
    SELECT p.id, pr.id,
           CASE WHEN v_days IS NULL THEN NULL ELSE now() + make_interval(days => v_days) END,
           'grade', p_grade_id
      FROM profiles p
      JOIN programs pr ON pr.is_active
     WHERE p.grade_id = p_grade_id
    ON CONFLICT (user_id, program_id) DO NOTHING;
  ELSE
    INSERT INTO user_program_access (user_id, program_id, expires_at, grant_source, granted_grade_id)
    SELECT p.id, a.program_id,
           CASE WHEN v_days IS NULL THEN NULL ELSE now() + make_interval(days => v_days) END,
           'grade', p_grade_id
      FROM profiles p
      JOIN grade_program_access a ON a.grade_id = p_grade_id AND a.can_access
     WHERE p.grade_id = p_grade_id
    ON CONFLICT (user_id, program_id) DO NOTHING;
  END IF;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.profiles_grade_change_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_days integer;
  v_auto boolean;
  v_premium boolean;
BEGIN
  IF NEW.grade_id IS NOT DISTINCT FROM OLD.grade_id THEN RETURN NULL; END IF;
  DELETE FROM user_program_access
   WHERE user_id = NEW.id AND grant_source = 'grade' AND granted_grade_id IS NOT DISTINCT FROM OLD.grade_id;
  IF NEW.grade_id IS NOT NULL THEN
    SELECT auto_grant, default_access_days, grants_premium INTO v_auto, v_days, v_premium FROM member_grades WHERE id = NEW.grade_id;
    IF COALESCE(v_auto, false) THEN
      IF COALESCE(v_premium, false) THEN
        INSERT INTO user_program_access (user_id, program_id, expires_at, grant_source, granted_grade_id)
        SELECT NEW.id, pr.id,
               CASE WHEN v_days IS NULL THEN NULL ELSE now() + make_interval(days => v_days) END,
               'grade', NEW.grade_id
          FROM programs pr WHERE pr.is_active
        ON CONFLICT (user_id, program_id) DO NOTHING;
      ELSE
        INSERT INTO user_program_access (user_id, program_id, expires_at, grant_source, granted_grade_id)
        SELECT NEW.id, a.program_id,
               CASE WHEN v_days IS NULL THEN NULL ELSE now() + make_interval(days => v_days) END,
               'grade', NEW.grade_id
          FROM grade_program_access a WHERE a.grade_id = NEW.grade_id AND a.can_access
        ON CONFLICT (user_id, program_id) DO NOTHING;
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$function$;

-- 5) 새 프로그램이 추가(또는 비공개→공개)되면 프리미엄 등급 회원 전원에게 자동 부여 → "새 프로그램도 자동 포함"
CREATE OR REPLACE FUNCTION public.programs_premium_grade_autogrant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF NOT NEW.is_active THEN RETURN NULL; END IF;
  INSERT INTO user_program_access (user_id, program_id, expires_at, grant_source, granted_grade_id)
  SELECT p.id, NEW.id,
         CASE WHEN g.default_access_days IS NULL THEN NULL ELSE now() + make_interval(days => g.default_access_days) END,
         'grade', g.id
    FROM member_grades g
    JOIN profiles p ON p.grade_id = g.id
   WHERE g.grants_premium
  ON CONFLICT (user_id, program_id) DO NOTHING;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS programs_premium_grade_autogrant ON public.programs;
CREATE TRIGGER programs_premium_grade_autogrant
  AFTER INSERT OR UPDATE OF is_active ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.programs_premium_grade_autogrant();

-- 6) 방금 만든 프리미엄 등급에 이미 회원이 있다면 전 활성 프로그램을 부여(현재는 0명일 수 있음 — 안전하게 한 번 실행)
SELECT public.apply_grade_programs(id) FROM public.member_grades WHERE grants_premium;
