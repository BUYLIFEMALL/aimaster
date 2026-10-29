-- 프리미엄 등급을 「접근 권한 관리 화면의 체크/해제」로 관리하도록 변경 (2026-10-29 주인님 지시).
--  - 0046에서 프리미엄 등급은 grade_program_access 체크와 무관하게 전 활성 프로그램을 자동 부여하고 새 프로그램도 자동 포함했는데,
--    골드·VIP와 똑같이 관리자가 화면에서 체크/해제로 관리하길 원하셔서 그 특례를 되돌린다.
--  - 유지: grants_premium 플래그, 프리미엄 가드(0031)의 「프리미엄 등급 회원 부여는 정지 제외」 — 체크한 프리미엄 배지 프로그램도 프리미엄 등급이면 열린다.
--  - 되돌림: apply_grade_programs·profiles_grade_change_sync 를 0032 원래(체크 기반) 로직으로 복원 + programs_premium_grade_autogrant(새 프로그램 자동) 트리거/함수 제거.
--  - grade_program_access_sync(0032, 미변경)가 프리미엄 등급 체크 시 자동 부여/회수를 처리하며, 그 INSERT는 가드 예외로 유효하게 유지된다.

-- 1) 새 프로그램 자동 부여 트리거·함수 제거
DROP TRIGGER IF EXISTS programs_premium_grade_autogrant ON public.programs;
DROP FUNCTION IF EXISTS public.programs_premium_grade_autogrant();

-- 2) apply_grade_programs 를 체크 기반(0032 원본)으로 복원
CREATE OR REPLACE FUNCTION public.apply_grade_programs(p_grade_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_days integer;
  v_auto boolean;
  v_count integer;
BEGIN
  SELECT auto_grant, default_access_days INTO v_auto, v_days FROM member_grades WHERE id = p_grade_id;
  IF NOT COALESCE(v_auto, false) THEN RETURN 0; END IF;
  INSERT INTO user_program_access (user_id, program_id, expires_at, grant_source, granted_grade_id)
  SELECT p.id, a.program_id,
         CASE WHEN v_days IS NULL THEN NULL ELSE now() + make_interval(days => v_days) END,
         'grade', p_grade_id
    FROM profiles p
    JOIN grade_program_access a ON a.grade_id = p_grade_id AND a.can_access
   WHERE p.grade_id = p_grade_id
  ON CONFLICT (user_id, program_id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- 3) profiles_grade_change_sync 를 체크 기반(0032 원본)으로 복원
CREATE OR REPLACE FUNCTION public.profiles_grade_change_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_days integer;
  v_auto boolean;
BEGIN
  IF NEW.grade_id IS NOT DISTINCT FROM OLD.grade_id THEN RETURN NULL; END IF;
  DELETE FROM user_program_access
   WHERE user_id = NEW.id AND grant_source = 'grade' AND granted_grade_id IS NOT DISTINCT FROM OLD.grade_id;
  IF NEW.grade_id IS NOT NULL THEN
    SELECT auto_grant, default_access_days INTO v_auto, v_days FROM member_grades WHERE id = NEW.grade_id;
    IF COALESCE(v_auto, false) THEN
      INSERT INTO user_program_access (user_id, program_id, expires_at, grant_source, granted_grade_id)
      SELECT NEW.id, a.program_id,
             CASE WHEN v_days IS NULL THEN NULL ELSE now() + make_interval(days => v_days) END,
             'grade', NEW.grade_id
        FROM grade_program_access a WHERE a.grade_id = NEW.grade_id AND a.can_access
      ON CONFLICT (user_id, program_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NULL;
END;
$function$;

-- grants_premium 컬럼·프리미엄 등급 행·프리미엄 가드(0031)의 등급 예외는 그대로 유지한다(변경하지 않음).
