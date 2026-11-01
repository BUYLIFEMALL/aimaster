-- 골드·VIP 회원 개별 프리미엄 프로그램 권한 (2026-11-01 주인님 승인).
-- 플랜: docs/PLAN_20261101_PREMIUM_INDIVIDUAL_GRANT.md
-- 표시: user_program_access.grant_source = 'premium_manual'. 회원은 이 표를 쓸 수 없다(0019).
-- 함께 수정: 프리미엄 등급 전환 때 만료된 옛 권한이 등급 권한을 막던 문제(ON CONFLICT DO NOTHING).
begin;

-- 1) 프리미엄 가드: 개별 프리미엄 권한은 정지하지 않는다.
CREATE OR REPLACE FUNCTION public.user_program_access_premium_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
AS $function$
BEGIN
  IF COALESCE(current_setting('app.premium_internal', true), '0') = '1' THEN
    RETURN NEW;
  END IF;
  IF NEW.grant_source = 'premium_manual' THEN
    RETURN NEW;
  END IF;
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

-- 2) 뱃지 변경: 달 때는 개별 권한을 제외하고, 뗄 때는 일반 권한으로 되돌린다(등급에 체크된 프로그램이면 등급 권한).
CREATE OR REPLACE FUNCTION public.programs_premium_badge()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
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
         AND u.grant_source IS DISTINCT FROM 'premium_manual'
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
      UPDATE public.user_program_access u
         SET grant_source = 'grade',
             granted_grade_id = g.id,
             expires_at = public.grade_access_expires_at(u.user_id, g.default_access_days, g.access_start_basis)
        FROM public.profiles pr
        JOIN public.member_grades g ON g.id = pr.grade_id AND g.auto_grant
        JOIN public.grade_program_access a ON a.grade_id = g.id AND a.can_access
       WHERE u.program_id = NEW.id AND u.grant_source = 'premium_manual'
         AND pr.id = u.user_id AND a.program_id = u.program_id;
      UPDATE public.user_program_access
         SET grant_source = 'manual'
       WHERE program_id = NEW.id AND grant_source = 'premium_manual';
    END IF;
    PERFORM set_config('app.premium_internal', '0', true);
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) 등급 일괄 연장은 개별 프리미엄 권한의 만료일을 건드리지 않는다.
CREATE OR REPLACE FUNCTION public.extend_grade_access(p_grade_id uuid, p_days integer DEFAULT NULL, p_until timestamptz DEFAULT NULL)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
     AND u.premium_suspended = false
     AND u.grant_source IS DISTINCT FROM 'premium_manual';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- 4) 개별 부여: 골드·VIP 회원 + 프리미엄 뱃지 공개 프로그램 + 미래 만료일만 허용한다.
CREATE OR REPLACE FUNCTION public.grant_premium_individual(p_user_id uuid, p_program_id uuid, p_expires_at timestamptz, p_granted_by uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF p_expires_at IS NULL OR p_expires_at <= now() THEN
    RAISE EXCEPTION '만료일은 오늘 이후로 지정해주세요';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM profiles pr JOIN member_grades g ON g.id = pr.grade_id
     WHERE pr.id = p_user_id AND g.slug IN ('gold', 'vip')
  ) THEN
    RAISE EXCEPTION '골드·VIP 회원에게만 부여할 수 있습니다';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM programs p WHERE p.id = p_program_id AND p.is_active AND 'premium' = ANY (COALESCE(p.badges, ARRAY[]::text[]))
  ) THEN
    RAISE EXCEPTION '프리미엄 뱃지 프로그램만 부여할 수 있습니다';
  END IF;
  INSERT INTO user_program_access (user_id, program_id, granted_by, expires_at, grant_source, granted_grade_id, premium_suspended, premium_prev_expires_at)
  VALUES (p_user_id, p_program_id, p_granted_by, p_expires_at, 'premium_manual', NULL, false, NULL)
  ON CONFLICT (user_id, program_id) DO UPDATE
    SET granted_by = EXCLUDED.granted_by,
        expires_at = EXCLUDED.expires_at,
        grant_source = 'premium_manual',
        granted_grade_id = NULL,
        premium_suspended = false,
        premium_prev_expires_at = NULL;
END;
$function$;

-- 5) 회수: 등급에 체크된 프로그램이면 등급 권한으로 되돌리고(가드가 다시 정지), 아니면 지운다.
CREATE OR REPLACE FUNCTION public.revoke_premium_individual(p_user_id uuid, p_program_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_grade_id uuid;
  v_days integer;
  v_basis text;
BEGIN
  SELECT g.id, g.default_access_days, g.access_start_basis INTO v_grade_id, v_days, v_basis
    FROM profiles pr
    JOIN member_grades g ON g.id = pr.grade_id AND g.auto_grant
    JOIN grade_program_access a ON a.grade_id = g.id AND a.can_access AND a.program_id = p_program_id
   WHERE pr.id = p_user_id;
  IF v_grade_id IS NOT NULL THEN
    UPDATE user_program_access
       SET expires_at = grade_access_expires_at(p_user_id, v_days, v_basis),
           grant_source = 'grade',
           granted_grade_id = v_grade_id
     WHERE user_id = p_user_id AND program_id = p_program_id AND grant_source = 'premium_manual';
  ELSE
    DELETE FROM user_program_access
     WHERE user_id = p_user_id AND program_id = p_program_id AND grant_source = 'premium_manual';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.grant_premium_individual(uuid, uuid, timestamptz, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_premium_individual(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_premium_individual(uuid, uuid, timestamptz, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_premium_individual(uuid, uuid) TO service_role;

-- 6) 프리미엄 등급: 정지·만료·개별 프리미엄 권한도 체크된 프로그램이면 등급 권한으로 전환한다.
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
       AND (u.premium_suspended = true OR u.expires_at <= now() OR u.grant_source = 'premium_manual');
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
           AND u.program_id = NEW.program_id
           AND (u.premium_suspended = true OR u.expires_at <= now() OR u.grant_source = 'premium_manual');
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$function$;

-- 7) 데이터 복구: 프리미엄 등급 회원의 체크된 프로그램 중 만료된 옛 권한. 2026-11-01 조회 기준 시험 계정 blog-neighbor-care 1건.
-- 복구 전 값: expires_at 2026-10-28 09:55:44.584288+00, premium_suspended false, grant_source NULL.
UPDATE public.user_program_access u
   SET expires_at = public.grade_access_expires_at(u.user_id, g.default_access_days, g.access_start_basis),
       grant_source = 'grade',
       granted_grade_id = g.id
  FROM public.profiles p
  JOIN public.member_grades g ON g.id = p.grade_id AND g.grants_premium
  JOIN public.grade_program_access a ON a.grade_id = g.id AND a.can_access
 WHERE p.id = u.user_id AND a.program_id = u.program_id AND u.expires_at <= now();

commit;
