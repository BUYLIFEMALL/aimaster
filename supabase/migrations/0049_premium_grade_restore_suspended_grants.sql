-- 프리미엄 등급 전환 때 정지된 옛 권한을 되살린다 (2026-10-31 주인님 승인).
-- 증상: buylifemall@naver.com이 프리미엄 등급인데 ai-work-workspace만 접근 불가.
-- 원인: profiles_grade_change_sync의 INSERT ... ON CONFLICT DO NOTHING이 프리미엄 가드로 정지된 수동 권한을 건너뜀.
-- 수정: grants_premium 등급으로 바뀌면, 그 등급에 체크된 프로그램의 정지 권한을 등급 권한으로 전환하고 기간을 새로 준다.
--       출처를 grade로 바꾸므로 등급을 내리면 다른 등급 권한과 함께 회수된다.
-- 나머지 로직(만료 계산 포함)은 0047과 같다.
CREATE OR REPLACE FUNCTION public.profiles_grade_change_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
      INSERT INTO user_program_access (user_id, program_id, expires_at, grant_source, granted_grade_id)
      SELECT NEW.id, a.program_id,
             CASE WHEN v_days IS NULL THEN NULL ELSE now() + make_interval(days => v_days) END,
             'grade', NEW.grade_id
        FROM grade_program_access a WHERE a.grade_id = NEW.grade_id AND a.can_access
      ON CONFLICT (user_id, program_id) DO NOTHING;
      IF COALESCE(v_premium, false) THEN
        UPDATE user_program_access u
           SET expires_at = CASE WHEN v_days IS NULL THEN NULL ELSE now() + make_interval(days => v_days) END,
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

-- 이미 막힌 시험 계정 1건 복구: 같은 등급의 다른 권한과 같은 만료일로 맞춘다.
-- 복구 전 값: expires_at 2026-10-28 09:55:44.584288+00, premium_suspended true, grant_source manual.
UPDATE public.user_program_access
   SET expires_at = '2027-10-29 00:40:40.828319+00',
       premium_suspended = false,
       premium_prev_expires_at = NULL,
       grant_source = 'grade',
       granted_grade_id = 'b767cd39-7787-4d98-af73-1ed3886cd03c'
 WHERE user_id = '4a82ff77-97f7-474d-866e-8e9431858ed3'
   AND program_id = '830b2f8c-3ca9-4bd5-acd8-bb0edb8ea747'
   AND premium_suspended = true;
