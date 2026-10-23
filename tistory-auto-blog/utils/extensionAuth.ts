import 'server-only'
import crypto from 'node:crypto'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { checkProgramAccess } from '@/lib/access/checkProgramAccess'

// BLOG 크롬 확장 연동 토큰 확인(2026-10-01). 토큰은 설정 화면에서 발급하고(app/settings/extensionTokenActions.ts),
// 공용 personal_access_tokens 테이블에 program_slug = 'tistory-auto-blog'로 해시만 저장한다(원문은 발급 순간 한 번만 보여줌).
// naver-blog-seo-studio/lib/extensionAuth.ts와 같은 방식이고, 이용 권한 판정은 이 앱의 공용 판정 코드(checkProgramAccess)를 쓴다.
export const EXTENSION_PROGRAM_SLUG = 'tistory-auto-blog'

// isAdmin: 확장 사이드패널의 관리자 전용 도구(화면 구조 분석)를 보일지 정하는 값. 권한 판정이 아니라 화면 표시용이며 서버 API 권한에는 쓰지 않는다.
export type ExtensionUser = { userId: string; email: string | null; name: string | null; isAdmin: boolean }

export function hashExtensionToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function verifyExtensionToken(request: Request): Promise<ExtensionUser | null> {
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return null

  const supabase = createAdminClient()
  const { data: tokenRow } = await supabase
    .from('personal_access_tokens')
    .select('id, user_id')
    .eq('token_hash', hashExtensionToken(token))
    .eq('program_slug', EXTENSION_PROGRAM_SLUG)
    .is('revoked_at', null)
    .maybeSingle()
  if (!tokenRow) return null

  const access = await checkProgramAccess(supabase, tokenRow.user_id, EXTENSION_PROGRAM_SLUG)
  if (!access.allowed) return null

  const { data: profile } = await supabase.from('profiles').select('email, name, is_admin').eq('id', tokenRow.user_id).maybeSingle()
  await supabase.from('personal_access_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', tokenRow.id)
  return { userId: tokenRow.user_id, email: profile?.email ?? null, name: profile?.name ?? null, isAdmin: profile?.is_admin === true }
}
