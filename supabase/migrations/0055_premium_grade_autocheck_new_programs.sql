-- 프리미엄 등급 새 프로그램 자동 포함 (2026-11-01 주인님 지시: 「자동 포함 켜줘」, 「최초 프로그램 등록시에만」. 0047의 체크 수동 방식을 이 부분만 변경).
-- 프로그램이 처음 공개될 때 한 번만 프리미엄 등급 체크를 넣는다. 관리자가 해제한 체크는 비공개 뒤 재공개해도 다시 켜지 않는다.
-- 회원 권한은 기존 grade_program_access_sync가 만든다.
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS premium_autochecked boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.programs.premium_autochecked IS '프리미엄 등급 자동 체크를 이미 한 번 처리했는지 표시';

-- 이미 공개 중인 프로그램은 처리된 것으로 본다(현재 체크 상태를 바꾸지 않는다).
UPDATE public.programs SET premium_autochecked = true WHERE is_active;

CREATE OR REPLACE FUNCTION public.programs_premium_grade_autocheck()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF NEW.is_active AND NOT NEW.premium_autochecked THEN
    INSERT INTO grade_program_access (grade_id, program_id, can_access)
    SELECT g.id, NEW.id, true FROM member_grades g WHERE g.grants_premium
    ON CONFLICT (grade_id, program_id) DO NOTHING;
    UPDATE programs SET premium_autochecked = true WHERE id = NEW.id;
  END IF;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.programs_premium_grade_autocheck() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS programs_premium_grade_autocheck ON public.programs;
CREATE TRIGGER programs_premium_grade_autocheck
  AFTER INSERT OR UPDATE OF is_active ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.programs_premium_grade_autocheck();
