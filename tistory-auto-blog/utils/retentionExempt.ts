import { createAdminClient } from '@/blog/utils/supabase/admin'
import { retentionCutoff } from '@/blog/utils/autoPublication'

// 2026-11-03: 30일 보관 예외 회원(profiles.retention_exempt, 관리자·시험 계정)은 30일이 지난 원고도 보이고 쓸 수 있다.
// 기준은 DB 한 곳이며 코드에 이메일을 적지 않는다. 읽지 못하면 일반 회원처럼 30일 기준(숨김은 지우는 것이 아니라 안전).
// 근거: docs/PLAN_20261031_RETENTION_EXEMPT_ACCOUNTS.md
export async function retentionCutoffFor(userId: string): Promise<string> {
  const { data, error } = await createAdminClient().from('profiles').select('retention_exempt').eq('id', userId).maybeSingle()
  return !error && data?.retention_exempt === true ? '1970-01-01T00:00:00.000Z' : retentionCutoff()
}
