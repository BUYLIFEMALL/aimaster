-- =============================================
-- AI Master — DB 스키마 (최종)
-- Supabase SQL Editor에서 전체 실행
-- =============================================

-- 1. 회원 등급
CREATE TABLE IF NOT EXISTS member_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  color text DEFAULT '#d4af37',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 2. 회원 프로필 (auth.users 확장)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  phone text,
  grade_id uuid REFERENCES member_grades(id),
  is_admin boolean DEFAULT false,
  affiliate_code text UNIQUE,
  referred_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- 3. 카테고리 (계층형)
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES categories(id),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  sort_order int DEFAULT 0
);

-- 4. 프로그램
CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  short_desc text,
  description text,
  thumbnail_url text,
  video_url text,
  images text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. 가격 플랜
CREATE TABLE IF NOT EXISTS pricing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  billing_type text NOT NULL CHECK (billing_type IN ('monthly','biannual','annual','lifetime')),
  price int NOT NULL,
  original_price int,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0
);

-- 6. 등급별 프로그램 접근 권한
CREATE TABLE IF NOT EXISTS grade_program_access (
  grade_id uuid REFERENCES member_grades(id) ON DELETE CASCADE,
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE,
  can_access boolean DEFAULT true,
  PRIMARY KEY (grade_id, program_id)
);

-- 7. 구독
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  program_id uuid REFERENCES programs(id),
  pricing_plan_id uuid REFERENCES pricing_plans(id),
  status text DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  payapp_order_id text,
  created_at timestamptz DEFAULT now()
);

-- 8. 결제 내역
CREATE TABLE IF NOT EXISTS payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  subscription_id uuid REFERENCES subscriptions(id),
  amount int NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  payapp_order_id text UNIQUE,
  payapp_data jsonb,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 9. 어필리에이트 수수료율
CREATE TABLE IF NOT EXISTS affiliate_rates (
  program_id uuid PRIMARY KEY REFERENCES programs(id) ON DELETE CASCADE,
  rate numeric(5,2) DEFAULT 10.00
);

-- 10. 어필리에이트 수익
CREATE TABLE IF NOT EXISTS affiliate_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES profiles(id),
  payment_record_id uuid REFERENCES payment_records(id),
  program_id uuid REFERENCES programs(id),
  commission_rate numeric(5,2),
  commission_amount int NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','settled','rejected')),
  created_at timestamptz DEFAULT now()
);

-- 11. 정산 요청
CREATE TABLE IF NOT EXISTS settlement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  amount int NOT NULL,
  bank_name text,
  account_number text,
  account_holder text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note text,
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- 12. 어필리에이트 클릭 추적
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_code text NOT NULL,
  referrer_id uuid REFERENCES profiles(id),
  ip_address text,
  user_agent text,
  page_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_code ON affiliate_clicks(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_referrer ON affiliate_clicks(referrer_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_date ON affiliate_clicks(created_at);

-- 13. 개별 사용자 프로그램 접근 권한
CREATE TABLE IF NOT EXISTS user_program_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES profiles(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE (user_id, program_id)
);

-- 14. 사용자 세션 (동시 접속 제한용)
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  device_info text,
  ip_address text,
  last_active timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

-- 15. 사이트 설정
CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- updated_at 자동 갱신 트리거 (programs만)
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS programs_updated_at ON programs;
CREATE TRIGGER programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ※ 회원 프로필 자동생성 트리거 없음 — 클라이언트에서 직접 생성

-- =============================================
-- RLS 활성화
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_program_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_program_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS 정책
-- =============================================

-- profiles
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
-- 본인 또는 서비스롤(관리자 API)에서 insert 허용
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR current_setting('role') = 'service_role');

-- member_grades: 누구나 읽기
DROP POLICY IF EXISTS "grades_select_all" ON member_grades;
CREATE POLICY "grades_select_all" ON member_grades FOR SELECT USING (true);

-- categories: 누구나 읽기
DROP POLICY IF EXISTS "categories_select_all" ON categories;
CREATE POLICY "categories_select_all" ON categories FOR SELECT USING (true);

-- programs: 공개만 읽기
DROP POLICY IF EXISTS "programs_select_active" ON programs;
CREATE POLICY "programs_select_active" ON programs FOR SELECT USING (is_active = true);

-- pricing_plans: 누구나 읽기
DROP POLICY IF EXISTS "pricing_plans_select_all" ON pricing_plans;
CREATE POLICY "pricing_plans_select_all" ON pricing_plans FOR SELECT USING (true);

-- subscriptions: 본인만
DROP POLICY IF EXISTS "subscriptions_select_own" ON subscriptions;
CREATE POLICY "subscriptions_select_own" ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- payment_records: 본인만
DROP POLICY IF EXISTS "payment_records_select_own" ON payment_records;
CREATE POLICY "payment_records_select_own" ON payment_records FOR SELECT USING (auth.uid() = user_id);

-- affiliate_rates: 누구나 읽기
DROP POLICY IF EXISTS "affiliate_rates_select_all" ON affiliate_rates;
CREATE POLICY "affiliate_rates_select_all" ON affiliate_rates FOR SELECT USING (true);

-- affiliate_earnings: 본인만
DROP POLICY IF EXISTS "affiliate_earnings_select_own" ON affiliate_earnings;
CREATE POLICY "affiliate_earnings_select_own" ON affiliate_earnings FOR SELECT USING (auth.uid() = referrer_id);

-- settlement_requests: 본인만
DROP POLICY IF EXISTS "settlements_select_own" ON settlement_requests;
DROP POLICY IF EXISTS "settlements_insert_own" ON settlement_requests;
CREATE POLICY "settlements_select_own" ON settlement_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "settlements_insert_own" ON settlement_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- affiliate_clicks: 본인 추천 클릭만 조회
DROP POLICY IF EXISTS "affiliate_clicks_select_own" ON affiliate_clicks;
CREATE POLICY "affiliate_clicks_select_own" ON affiliate_clicks FOR SELECT USING (auth.uid() = referrer_id);

-- user_program_access: 본인만 조회
DROP POLICY IF EXISTS "upa_select_own" ON user_program_access;
CREATE POLICY "upa_select_own" ON user_program_access FOR SELECT USING (auth.uid() = user_id);

-- user_sessions: 본인만 조회
DROP POLICY IF EXISTS "sessions_select_own" ON user_sessions;
CREATE POLICY "sessions_select_own" ON user_sessions FOR SELECT USING (auth.uid() = user_id);

-- site_settings: 누구나 읽기
DROP POLICY IF EXISTS "site_settings_select_all" ON site_settings;
CREATE POLICY "site_settings_select_all" ON site_settings FOR SELECT USING (true);

-- =============================================
-- 기본 데이터
-- =============================================
INSERT INTO categories (name, slug, sort_order) VALUES
  ('SNS 마케팅', 'sns-marketing', 1),
  ('쇼핑몰 자동화', 'shopping-automation', 2),
  ('콘텐츠 제작', 'content-creation', 3),
  ('이메일 마케팅', 'email-marketing', 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO member_grades (name, slug, color, sort_order) VALUES
  ('일반', 'basic', '#a0a0b0', 1),
  ('실버', 'silver', '#c0c0c0', 2),
  ('골드', 'gold', '#d4af37', 3),
  ('VIP', 'vip', '#f5c842', 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO site_settings (key, value) VALUES
  ('concurrent_login_policy', '"force_logout"')
ON CONFLICT (key) DO NOTHING;

SELECT 'Schema created successfully!' AS result;
