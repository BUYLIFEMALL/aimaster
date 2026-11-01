-- 프리미엄 등급에서 내릴 때 남는 프리미엄 프로그램 수동 권한 정지 (2026-11-01 주인님 승인).
-- 프리미엄 등급일 때는 가드가 정지를 건너뛰므로, 등급을 내리는 시점에 정지한다. 개별 프리미엄 권한(premium_manual)은 유지한다.
-- 함수만 고치며 기존 권한 데이터는 바꾸지 않는다.
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
           AND u.user_id = NEW.id
           AND (u.premium_suspended = true OR u.expires_at <= now() OR u.grant_source = 'premium_manual');
      END IF;
    END IF;
  END IF;
  IF OLD.grade_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM member_grades WHERE id = OLD.grade_id AND grants_premium)
     AND NOT COALESCE((SELECT grants_premium FROM member_grades WHERE id = NEW.grade_id), false) THEN
    PERFORM set_config('app.premium_internal', '1', true);
    UPDATE user_program_access u
       SET premium_prev_expires_at = u.expires_at,
           premium_suspended = true,
           expires_at = now() - interval '1 second'
      FROM programs p
     WHERE u.user_id = NEW.id AND u.program_id = p.id
       AND 'premium' = ANY (COALESCE(p.badges, ARRAY[]::text[]))
       AND u.premium_suspended = false
       AND u.grant_source IS DISTINCT FROM 'premium_manual';
    PERFORM set_config('app.premium_internal', '0', true);
  END IF;
  RETURN NULL;
END;
$function$;
