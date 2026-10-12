-- 등급별 프로그램 자동 부여 (2026-10-13 주인님 지시): 골드(드림팀)·VIP(드림AI팀) 등급에 프로그램을 미리 체크해 두면
-- 그 등급 회원에게 사용권한(user_program_access)이 자동으로 생기고, 체크를 풀면 자동 부여분이 회수된다.
-- 정책 상세: docs/GRADE_AND_BILLING_POLICY.md §자동 부여
--
-- 설계 원칙
--  - 각 프로그램의 판정 코드는 고치지 않는다(기존 user_program_access 판정 그대로). 프리미엄 가드 트리거도 그대로 적용된다.
--  - 자동 부여분에는 grant_source='grade', granted_grade_id 표시를 붙여, 회수할 때 관리자가 손으로 따로 준 권한은 건드리지 않는다.
--  - 이미 있는 부여(수동 약 9천 건)는 건드리지 않는다. 자동 부여는 "없는 것만 추가"(ON CONFLICT DO NOTHING).
--  - 자동 부여는 member_grades.auto_grant=true 인 등급만(현재 골드·VIP). 일반·실버는 기존 방식 그대로.

ALTER TABLE public.member_grades
  ADD COLUMN IF NOT EXISTS auto_grant boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_access_days integer;

COMMENT ON COLUMN public.member_grades.auto_grant IS 'true면 이 등급에 체크된 프로그램(grade_program_access)을 등급 회원에게 자동 부여·회수';
COMMENT ON COLUMN public.member_grades.default_access_days IS '자동 부여 시 기본 사용기간(일). NULL=무기한. 골드 180, VIP 365';

ALTER TABLE public.user_program_access
  ADD COLUMN IF NOT EXISTS grant_source text,
  ADD COLUMN IF NOT EXISTS granted_grade_id uuid REFERENCES public.member_grades(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.user_program_access.grant_source IS '''grade''=등급 자동 부여분, NULL=관리자가 직접 준 것';

-- 골드·VIP 에만 자동 부여 켬 (기본 기간: 골드 6개월, VIP 1년)
UPDATE public.member_grades SET auto_grant = true, default_access_days = 180 WHERE name LIKE '골드%';
UPDATE public.member_grades SET auto_grant = true, default_access_days = 365 WHERE name LIKE 'VIP%';

-- 등급 하나의 회원 전원에게, 등급에 체크된 프로그램 중 없는 것만 부여(기존 부여는 유지)
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

-- 등급 회원 전원의 사용기간을 한 번에 연장(p_days 만큼 더하기) 또는 특정 날짜로 지정(p_until).
-- 무기한(NULL)과 프리미엄으로 정지된 부여는 건드리지 않는다.
CREATE OR REPLACE FUNCTION public.extend_grade_access(p_grade_id uuid, p_days integer DEFAULT NULL, p_until timestamptz DEFAULT NULL)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_count integer;
BEGIN
  IF p_days IS NULL AND p_until IS NULL THEN RAISE EXCEPTION 'p_days 또는 p_until 필요'; END IF;
  UPDATE user_program_access u
     SET expires_at = CASE WHEN p_until IS NOT NULL THEN p_until
                           ELSE GREATEST(u.expires_at, now()) + make_interval(days => p_days) END
   WHERE u.user_id IN (SELECT id FROM profiles WHERE grade_id = p_grade_id)
     AND u.expires_at IS NOT NULL
     AND u.premium_suspended = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- 등급 프로그램 표(grade_program_access) 변경 → 등급 회원에게 자동 부여/회수
CREATE OR REPLACE FUNCTION public.grade_program_access_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_days integer;
  v_auto boolean;
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') AND (TG_OP = 'DELETE' OR NOT NEW.can_access) THEN
    DELETE FROM user_program_access
     WHERE program_id = OLD.program_id AND grant_source = 'grade' AND granted_grade_id = OLD.grade_id;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.can_access THEN
    SELECT auto_grant, default_access_days INTO v_auto, v_days FROM member_grades WHERE id = NEW.grade_id;
    IF COALESCE(v_auto, false) THEN
      INSERT INTO user_program_access (user_id, program_id, expires_at, grant_source, granted_grade_id)
      SELECT p.id, NEW.program_id,
             CASE WHEN v_days IS NULL THEN NULL ELSE now() + make_interval(days => v_days) END,
             'grade', NEW.grade_id
        FROM profiles p WHERE p.grade_id = NEW.grade_id
      ON CONFLICT (user_id, program_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS grade_program_access_sync ON public.grade_program_access;
CREATE TRIGGER grade_program_access_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.grade_program_access
  FOR EACH ROW EXECUTE FUNCTION public.grade_program_access_sync();

-- 회원의 등급이 바뀌면: 이전 등급의 자동 부여분 회수 + 새 등급의 프로그램 자동 부여
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

DROP TRIGGER IF EXISTS profiles_grade_change_sync ON public.profiles;
CREATE TRIGGER profiles_grade_change_sync
  AFTER UPDATE OF grade_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_grade_change_sync();

-- 이 함수들은 서버(service role)에서만 호출한다
REVOKE ALL ON FUNCTION public.apply_grade_programs(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.extend_grade_access(uuid, integer, timestamptz) FROM PUBLIC, anon, authenticated;
