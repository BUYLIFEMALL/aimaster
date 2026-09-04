-- Phase 21 — 예약 소싱 알림(Phase 18)/관심상품 변경 알림(Phase 14)에 "카카오 알림톡" 채널을
-- 추가하기 위한 템플릿 ID 저장 테이블. 알림톡은 사전 승인된 템플릿으로만 발송 가능해서,
-- 발송 문구 전체를 담을 단일 변수(예: #{내용})로 구성한 템플릿을 회원이 본인 Solapi
-- 계정(user_solapi_accounts, 공용 테이블)에 등록해두고, 그 템플릿 ID를 여기 저장한다.
CREATE TABLE IF NOT EXISTS user_kakao_alimtalk_templates (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sourcing_template_id text,
  price_template_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_kakao_alimtalk_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_kakao_alimtalk_templates_owner ON user_kakao_alimtalk_templates;
CREATE POLICY user_kakao_alimtalk_templates_owner ON user_kakao_alimtalk_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
