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

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // 6. 15+ 에러 메시지를 한국어로 전송
    let msg = error.message
    if (msg === 'Invalid login credentials') {
      msg = '이메일 또는 비밀번호가 올바르지 않습니다.'
    }
    return { error: msg }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

// 회원가입은 AIMaster에서만 받는다 — 모든 AI 프로그램은 AIMaster 계정/구독 권한을 공유한다.
// (app/auth/auth-form.tsx에서 AIMaster 회원가입 페이지로 안내)

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
