import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  // 관리자 연결에는 서버 전용 키만 사용합니다.
  const supabaseKey = (process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  if (!supabaseKey) throw new Error("Supabase 서버 연결 키가 설정되지 않았습니다.");

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
