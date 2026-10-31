-- 등급 권한 함수의 남은 틈 수정 (2026-10-31 주인님 승인).
-- 1) 0047이 0032 원본으로 되돌리며 빠진 가입일 기준 만료(0036, grade_access_expires_at)를 profiles_grade_change_sync·apply_grade_programs에 복원한다.
--    앞으로 등급을 바꾸거나 일괄 적용하는 회원부터 적용되며, 이미 있는 권한의 만료일은 바꾸지 않는다.
-- 2) 0049의 프리미엄 정지 권한 복구를 체크 동기화(grade_program_access_sync)와 일괄 적용(apply_grade_programs)에도 넣는다.

CREATE OR REPLACE FUNCTION public.profiles_grade_change_sync()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_days integer;
  v_auto boolean;
  v_basis text;
  v_premium boolean;
BEGIN
  IF NEW.grade_id IS NOT DISTINCT FROM OLD.grade_id THEN RETURN NULL; END IF;
  DELETE FROM user_program_access
   WHERE user_id = NEW.id AND grant_source = 'grade' AND granted_grade_id IS NOT DISTINCT FROM OLD.grade_id;
  IF NEW.grade_id IS NOT NULL THEN
    SELECT auto_grant, default_access_days, access_start_basis, grants_premium INTO v_auto, v_days, v_basis, v_premium FROM member_grades WHERE id = NEW.grade_id;
    IF COALESCE(v_auto, false) THEN
      INSERT INTO user_program_access (user_id, program_id, expires_at, grant_source, granted_grade_id)
      SELECT NEW.id, a.program_id, grade_access_expires_at(NEW.id, v_days, v_basis), 'grade', NEW.grade_id
        FROM grade_program_access a WHERE a.grade_id = NEW.grade_id AND a.can_access
      ON CONFLICT (user_id, program_id) DO NOTHING;
      IF COALESCE(v_premium, false) THEN
        UPDATE user_program_access u
           SET expires_at = grade_access_expires_at(NEW.id, v_days, v_basis),
               premium_suspended = false,
               premium_prev_expires_at = NULL,
               grant_source = 'grade',
               granted_grade_id = NEW.grade_id
          FROM grade_program_access a
         WHERE a.grade_id = NEW.grade_id AND a.can_access AND a.program_id = u.program_id
           AND u.user_id = NEW.id AND u.premium_suspended = true;
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_grade_programs(p_grade_id uuid)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_days integer;
  v_auto boolean;
  v_basis text;
  v_premium boolean;
  v_count integer;
  v_restored integer := 0;
BEGIN
  SELECT auto_grant, default_access_days, access_start_basis, grants_premium INTO v_auto, v_days, v_basis, v_premium FROM member_grades WHERE id = p_grade_id;
  IF NOT COALESCE(v_auto, false) THEN RETURN 0; END IF;
  INSERT INTO user_program_access (user_id, program_id, expires_at, grant_source, granted_grade_id)
  SELECT p.id, a.program_id, grade_access_expires_at(p.id, v_days, v_basis), 'grade', p_grade_id
    FROM profiles p JOIN grade_program_access a ON a.grade_id = p_grade_id AND a.can_access
   WHERE p.grade_id = p_grade_id
  ON CONFLICT (user_id, program_id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF COALESCE(v_premium, false) THEN
    UPDATE user_program_access u
       SET expires_at = grade_access_expires_at(u.user_id, v_days, v_basis),
           premium_suspended = false,
           premium_prev_expires_at = NULL,
           grant_source = 'grade',
           granted_grade_id = p_grade_id
      FROM profiles p, grade_program_access a
     WHERE p.id = u.user_id AND p.grade_id = p_grade_id
       AND a.grade_id = p_grade_id AND a.can_access AND a.program_id = u.program_id
       AND u.premium_suspended = true;
    GET DIAGNOSTICS v_restored = ROW_COUNT;
  END IF;
  RETURN v_count + v_restored;
END;
$function$;

CREATE OR REPLACE FUNCTION public.grade_program_access_sync()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_days integer;
  v_auto boolean;
  v_basis text;
  v_premium boolean;
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') AND (TG_OP = 'DELETE' OR NOT NEW.can_access) THEN
    DELETE FROM user_program_access
     WHERE program_id = OLD.program_id AND grant_source = 'grade' AND granted_grade_id = OLD.grade_id;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.can_access THEN
    SELECT auto_grant, default_access_days, access_start_basis, grants_premium INTO v_auto, v_days, v_basis, v_premium FROM member_grades WHERE id = NEW.grade_id;
    IF COALESCE(v_auto, false) THEN
      INSERT INTO user_program_access (user_id, program_id, expires_at, grant_source, granted_grade_id)
      SELECT p.id, NEW.program_id, grade_access_expires_at(p.id, v_days, v_basis), 'grade', NEW.grade_id
        FROM profiles p WHERE p.grade_id = NEW.grade_id
      ON CONFLICT (user_id, program_id) DO NOTHING;
      IF COALESCE(v_premium, false) THEN
        UPDATE user_program_access u
           SET expires_at = grade_access_expires_at(u.user_id, v_days, v_basis),
               premium_suspended = false,
               premium_prev_expires_at = NULL,
               grant_source = 'grade',
               granted_grade_id = NEW.grade_id
          FROM profiles p
         WHERE p.id = u.user_id AND p.grade_id = NEW.grade_id
           AND u.program_id = NEW.program_id AND u.premium_suspended = true;
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$function$;
