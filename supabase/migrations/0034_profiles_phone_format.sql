-- 핸드폰 표기 통일(2026-10-13): 010-1234-5678(11자리) / 011-123-4567(10자리).
--  원인: (1) lib/utils/format.ts 의 formatPhoneNumber 가 10자리를 3-4-3 으로 끊어 "010-4876-079" 같은 값이 저장됨(수정 완료)
--        (2) 이전 경로(가입 트리거·관리자 직접 저장 등)로 하이픈 없이 저장된 번호(01093572925 등) 7건
--  조치: 기존 값 일괄 정리 + 어떤 경로로 저장해도 profiles.phone 이 자동으로 같은 표기가 되도록 트리거 추가. 유효하지 않은 값은 변환하지 않는다.
CREATE OR REPLACE FUNCTION public.format_mobile_phone(p text)
 RETURNS text LANGUAGE plpgsql IMMUTABLE
AS $function$
DECLARE d text;
BEGIN
  IF p IS NULL THEN RETURN NULL; END IF;
  d := regexp_replace(p, '\D', '', 'g');
  IF d ~ '^01[016789]\d{8}$' THEN RETURN substr(d,1,3) || '-' || substr(d,4,4) || '-' || substr(d,8,4); END IF;
  IF d ~ '^01[016789]\d{7}$' THEN RETURN substr(d,1,3) || '-' || substr(d,4,3) || '-' || substr(d,7,4); END IF;
  RETURN p;
END;
$function$;

UPDATE public.profiles SET phone = public.format_mobile_phone(phone)
 WHERE phone IS NOT NULL AND phone <> public.format_mobile_phone(phone);

CREATE OR REPLACE FUNCTION public.profiles_phone_format()
 RETURNS trigger LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.phone := public.format_mobile_phone(NEW.phone);
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS profiles_phone_format ON public.profiles;
CREATE TRIGGER profiles_phone_format BEFORE INSERT OR UPDATE OF phone ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_phone_format();
