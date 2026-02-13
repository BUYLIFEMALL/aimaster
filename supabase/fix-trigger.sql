-- 기존 트리거 제거 (클라이언트 코드에서 직접 처리)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- profiles RLS 정책 재설정 (서비스롤 허용)
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

-- 본인 insert + 서비스롤(트리거) insert 허용
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

SELECT 'Trigger removed, RLS fixed!' AS result;
