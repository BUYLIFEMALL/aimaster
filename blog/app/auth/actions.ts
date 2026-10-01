'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/blog/utils/supabase/server'

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

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
