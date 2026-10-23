-- 핸드폰 번호 필수 등록 정책(2026-10-12 주인님 지시).
--  - 신규 가입은 이름·이메일·핸드폰 필수, 핸드폰 번호가 저장된 회원만 프로그램 이용 가능(관리자 제외).
--  - 일반 전화는 허용하지 않고 핸드폰 번호(010·011·016·017·018·019)만 유효하다.
--  - 기존 회원 239명 중 핸드폰이 저장된 회원은 19명(2026-10-12 기준). 번호가 없는 회원은 로그인 때 안내를 받고 입력해야 한다.

-- 1) 가입 트리거: 회원가입 때 보낸 이름·핸드폰(raw_user_meta_data)을 profiles 에 함께 저장한다.
--    (예전에는 이름만 저장해서, 화면이 보낸 핸드폰이 "이미 있는 프로필"이라는 이유로 버려졌다.)
--    신규 가입은 이름·핸드폰이 필수라서, 둘 중 하나라도 없거나 핸드폰 형식이 아니면 가입 자체를 거절한다
--    (화면 검사를 우회한 직접 호출 방지).
--    주의: 관리자가 Auth 에서 직접 만드는 계정도 user_metadata 에 name·phone 을 넣어야 한다.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_digits text := regexp_replace(COALESCE(NEW.raw_user_meta_data->>'phone', ''), '[^0-9]', '', 'g');
  v_name text := btrim(COALESCE(NEW.raw_user_meta_data->>'name', ''));
  v_phone text;
BEGIN
  IF v_name = '' THEN
    RAISE EXCEPTION '이름은 필수입니다.' USING ERRCODE = '23514';
  END IF;
  IF v_digits !~ '^01[016789][0-9]{7,8}$' THEN
    RAISE EXCEPTION '핸드폰 번호는 필수입니다.' USING ERRCODE = '23514';
  END IF;

  IF length(v_digits) = 11 THEN
    v_phone := substr(v_digits, 1, 3) || '-' || substr(v_digits, 4, 4) || '-' || substr(v_digits, 8, 4);
  ELSE
    v_phone := substr(v_digits, 1, 3) || '-' || substr(v_digits, 4, 3) || '-' || substr(v_digits, 7, 4);
  END IF;

  INSERT INTO public.profiles (id, email, name, phone, affiliate_code)
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_phone,
    upper(substr(md5(random()::text), 1, 8))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- 2) 저장 규칙: 번호가 있다면 핸드폰 형식이어야 한다(번호가 없는 기존 회원은 NULL·빈 문자열 허용 — 회원 정지·등급 변경 같은 수정이 막히지 않게).
--    NOT VALID: 기존 행은 검사하지 않고 앞으로의 저장·수정만 검사한다.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_mobile_chk
  CHECK (phone IS NULL OR btrim(phone) = '' OR regexp_replace(phone, '[^0-9]', '', 'g') ~ '^01[016789][0-9]{7,8}$') NOT VALID;

COMMENT ON COLUMN public.profiles.phone IS '핸드폰 번호(필수 등록 정책, 010-1234-5678 형식). NULL 이면 프로그램 이용 불가(관리자 제외).';
