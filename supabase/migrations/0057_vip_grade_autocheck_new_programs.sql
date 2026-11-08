-- VIP 등급 새 프로그램 자동 포함 (2026-11-08 주인님 지시: 「VIP등급의 경우 프리미엄을 제외하고 새로운 프로그램이 등록되면 자동으로 권한 부여」
-- 「이 프로그램 뿐만 아니라 앞으로도 새로 신규 프로그램등록되면」). 0055(프리미엄 등급 자동 포함)와 같은 방식.
-- 계기: free-music-studio(2026-11-03 공개)가 프리미엄에만 자동 체크되고 VIP 체크가 빠져 VIP 회원이 못 씀 → 2026-11-08 손으로 체크(VIP 152명 부여).
-- 프로그램이 처음 공개될 때 한 번만 VIP 등급(slug 'vip') 체크를 넣는다. 관리자가 해제한 체크는 비공개 뒤 재공개해도 다시 켜지 않는다.
-- 회원 권한은 기존 grade_program_access_sync가 만들고(가입일 + 1년 등 등급 규칙 그대로),
-- 프리미엄 뱃지 프로그램은 기존 장치(programs_premium_badge·user_program_access_premium_guard)가 VIP 부여분도 효력 정지한다(프리미엄 우선 — 「프리미엄 제외」).
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS vip_autochecked boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.programs.vip_autochecked IS 'VIP 등급 자동 체크를 이미 한 번 처리했는지 표시';

-- 이미 공개 중인 프로그램은 처리된 것으로 본다(현재 체크 상태를 바꾸지 않는다 — 2026-11-08 공개 78개 모두 VIP 체크됨 확인).
UPDATE public.programs SET vip_autochecked = true WHERE is_active;

CREATE OR REPLACE FUNCTION public.programs_vip_grade_autocheck()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF NEW.is_active AND NOT NEW.vip_autochecked THEN
    INSERT INTO grade_program_access (grade_id, program_id, can_access)
    SELECT g.id, NEW.id, true FROM member_grades g WHERE g.slug = 'vip'
    ON CONFLICT (grade_id, program_id) DO NOTHING;
    UPDATE programs SET vip_autochecked = true WHERE id = NEW.id;
  END IF;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.programs_vip_grade_autocheck() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS programs_vip_grade_autocheck ON public.programs;
CREATE TRIGGER programs_vip_grade_autocheck
  AFTER INSERT OR UPDATE OF is_active ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.programs_vip_grade_autocheck();
