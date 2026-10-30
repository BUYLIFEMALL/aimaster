'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/blog/utils/supabase/server'
import { IS_STANDALONE, SITE_URL } from '@/lib/deployment'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: '이메일과 비밀번호를 입력해주세요.' }
  }

  let error: { message: string } | null = null
  try {
    ;({ error } = await supabase.auth.signInWithPassword({ email, password }))
  } catch {
    // 회원 DB(Supabase)에 연결하지 못한 경우. 예전엔 "fetch failed"가 그대로 보였다(2026-10-01, 잘못된 접속 주소 설정으로 발생).
    return { error: '로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' }
  }

  if (error) {
    // 6. 15+ 에러 메시지를 한국어로 전송
    let msg = error.message
    if (msg === 'Invalid login credentials') {
      msg = '이메일 또는 비밀번호가 올바르지 않습니다.'
    }
    return { error: msg }
  }

  revalidatePath('/', 'layout')
  redirect(safeRedirectPath(formData.get('redirect')))
}

// 로그인 전에 보던 화면으로 돌려보낸다. 외부 주소로 튕겨나가지 않게 이 앱 안의 경로(/로 시작, //는 제외)만 허용한다.
function safeRedirectPath(value: FormDataEntryValue | null): string {
  const path = typeof value === 'string' ? value : ''
  return path.startsWith('/') && !path.startsWith('//') ? path : '/'
}

// 회원가입은 AIMaster에서만 받는다 — 모든 AI 프로그램은 AIMaster 계정/구독 권한을 공유한다.
// (app/auth/auth-form.tsx에서 AIMaster 회원가입 페이지로 안내)
// 단, 독립 운영(수강생 설치 키트)은 자체 가입을 받는다(lib/deployment.ts, 기준 insta_auto_poster signUpAction).
export async function signup(formData: FormData): Promise<{ error?: string; notice?: string } | void> {
  if (!IS_STANDALONE) return { error: '회원가입은 AIMaster에서 진행됩니다.' }
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  if (!email || !password) return { error: '이메일과 비밀번호를 입력해주세요.' }
  if (password.length < 6) return { error: '비밀번호는 6자 이상으로 정해주세요.' }

  const supabase = await createClient()
  // 확인 메일 링크가 Supabase 기본 주소(localhost)가 아니라 내 사이트로 돌아오게 한다(Supabase URL Configuration에도 이 주소를 허용해야 함).
  const emailRedirectTo = SITE_URL ? `${SITE_URL}/auth/confirm` : undefined
  let result
  try {
    result = await supabase.auth.signUp({ email, password, options: emailRedirectTo ? { emailRedirectTo } : undefined })
  } catch {
    return { error: '가입 서버(Supabase)에 연결하지 못했습니다. 설치 때 넣은 Supabase 주소·키를 확인해 주세요.' }
  }
  if (result.error) {
    return { error: /already registered/i.test(result.error.message) ? '이미 가입된 이메일입니다. 로그인해 주세요.' : `가입하지 못했습니다: ${result.error.message}` }
  }
  if (!result.data.session) {
    return { notice: '가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요. (설치한 분은 Supabase에서 Confirm email을 끄면 바로 로그인됩니다)' }
  }
  revalidatePath('/', 'layout')
  redirect(safeRedirectPath(formData.get('redirect')))
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
