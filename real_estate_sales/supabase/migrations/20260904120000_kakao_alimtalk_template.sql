-- 실거래 변동 알림에 카카오 알림톡 채널을 추가하기 위한 템플릿 ID 저장 테이블.
-- 발송 문구 전체를 담을 단일 변수(예: #{내용})로 구성한 템플릿을 회원이 본인
-- Solapi 계정(user_solapi_accounts, 공용 테이블)에 등록해두고, 그 템플릿 ID를
-- 여기 저장한다. real_estate_sales는 알림 메시지 유형이 1가지뿐이라 템플릿도 1개만 둔다.
CREATE TABLE IF NOT EXISTS real_estate_kakao_templates (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE real_estate_kakao_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS real_estate_kakao_templates_owner ON real_estate_kakao_templates;
CREATE POLICY real_estate_kakao_templates_owner ON real_estate_kakao_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
