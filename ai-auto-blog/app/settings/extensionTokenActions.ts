'use server'

import crypto from 'node:crypto'
import { checkProgramAccessApi } from '@/utils/access'
import { createAdminClient } from '@/utils/supabase/admin'
import { EXTENSION_PROGRAM_SLUG, hashExtensionToken } from '@/utils/extensionAuth'

// BLOG 크롬 확장 연동 토큰 발급·조회·폐기(2026-10-01). 로그인만이 아니라 ai-auto-blog 이용 권한까지 확인한다.
// 토큰 원문은 발급 순간 한 번만 돌려주고, DB에는 sha256 해시만 저장한다(naver-blog-seo-studio/lib/tokenActions.ts와 같은 방식).
export type ExtensionToken = { id: string; label: string | null; created_at: string; last_used_at: string | null }

const DEFAULT_LABEL = 'BLOG 크롬 확장'

export async function listExtensionTokens(): Promise<{ tokens?: ExtensionToken[]; error?: string }> {
  const access = await checkProgramAccessApi()
  if (!access.allowed) return { error: access.error }
  const { data, error } = await createAdminClient()
    .from('personal_access_tokens')
    .select('id, label, created_at, last_used_at')
    .eq('user_id', access.user.id)
    .eq('program_slug', EXTENSION_PROGRAM_SLUG)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
  if (error) return { error: error.message }
  return { tokens: data ?? [] }
}

export async function createExtensionToken(label: string): Promise<{ token?: string; item?: ExtensionToken; error?: string }> {
  const access = await checkProgramAccessApi()
  if (!access.allowed) return { error: access.error }
  const rawToken = `pat_${crypto.randomBytes(32).toString('hex')}`
  const { data, error } = await createAdminClient()
    .from('personal_access_tokens')
    .insert({
      user_id: access.user.id,
      program_slug: EXTENSION_PROGRAM_SLUG,
      label: label.trim().slice(0, 60) || DEFAULT_LABEL,
      token_hash: hashExtensionToken(rawToken),
    })
    .select('id, label, created_at, last_used_at')
    .single()
  if (error) return { error: error.message }
  return { token: rawToken, item: data }
}

export async function revokeExtensionToken(id: string): Promise<{ ok?: true; error?: string }> {
  const access = await checkProgramAccessApi()
  if (!access.allowed) return { error: access.error }
  const { error } = await createAdminClient()
    .from('personal_access_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', access.user.id)
    .eq('program_slug', EXTENSION_PROGRAM_SLUG)
  return error ? { error: error.message } : { ok: true }
}
